var _ = require('underscore');
var async = require('async');
var string = require('../module/util/string');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var Issue = require('./issue');
var User = require('./user');
var stages = require('./stages');

var ID_LENGTH = 12;

var createID = string.createRandomCode.bind(string, ID_LENGTH);

var Projects = new Schema({
    id: { type: String, default: createID, required: true },
    name: { type: String, required: true },
    members: [
        {
            user: { type: ObjectId, ref: 'User', required: true },
            created_at: { type: Date, default: Date.now, required: true },
            accessLevel: { type: String, default: 1, required: true }
        }
    ],
    issues: [Issue.schema],
    github: {  // option
        userName: { type: String },
        repoName: { type: String },
        url: { type: String },
        sync: { type: Boolean, default: true, required: true }
    },
    create_user: { type: ObjectId, ref: 'User', required: true },
    created_at: { type: Date, default: Date.now, required: true }
});

Projects.static('findPopulated', function (where, o, callback) {
    o = o || {};

    this.find(where)
        .populate('create_user')
        .populate('members.user')
        .exec(function (err, docs) {
            if (err) { callback(err); }

            if (o.one) {
                if (docs.length) { callback(null, docs[0]); }
                else { callback(null, null); }
            } else {
                callback(null, docs);
            }
        });
});

/*** member ***/
// もし存在しないユーザなら作成する
Projects.method('addMember', function (userName, callback) {
    var project = this;

    User.findOrCreate(userName, function (err, user) {
        if (err) { callback(err); return; }

        if (_.find(project.members, function (member) {
                return String(member.user) === String(user._id);
            })) {
            callback(new Error('already added member'));
            return;
        }

        project.members.unshift({user: user});

        project.save(function (err, project) {
            if (err) { callback(err); return; }

            project.populate('members.user', function (err, project) {
                callback(err, project, project.members[0]);
            });
        });
    });
});

Projects.method('removeMember', function (userName, callback) {
    var project = this;

    User.findOne({userName: userName}, function (err, user) {
        if (err) { callback(err); return; }
        if (!user) { callback(new Error('undefined user name: ' + userName)); return; }

        project.populate('members.user', function (err, project) {
            if (err) { callback(err); return; }

            var member = _.find(project.members, function (member) {
                return String(member.user._id) === String(user._id);
            });
            if (!member) { callback(new Error('undefined member name: ' + userName)); return; }

            project.members.pull(member);

            project.save(function (err, project) {
                if (err) { callback(err); return; }

                callback(err, project, member);
            });
        });
    });
});

/*** /member ***/

/*** issue ***/
Projects.method('addIssue', function (token, params, callback) {
    var project = this;
    var GitHub = require('./github');
    var issue;

    async.series([
        // github hook
        function (next) {
            if (token && project.github && project.github.sync) {
                (new GitHub(token)).createIssue(project.github.repoName, project.github.userName, params, function (err, data) {
                    issue = data;
                    next(err);
                });
            } else {
                next(null);
            }
        },
        // issue作成
        function (next) {
            if (issue) { next(null); return; }
            Issue.create(params, function (err, data) {
                issue = data;
                next(err);
            });
        },
        // projectにissue追加
        function (next) {
            project.issues.unshift(issue);
            project.save(function (err, data) {
                project = data;
                next(err);
            });
        }
    ], function (err) {
        if (err) { callback(err); return; }
        callback(err, project, issue);
    });
});

Projects.method('removeIssue', function (token, issueId, callback) {
    var project = this;
    var GitHub = require('./github');

    // issue取り出し
    var issue = _.find(project.issues, function (issue) {
        return String(issue._id) === String(issueId);
    });
    if (!issue) { callback(new Error('undefined issue id: ' + issueId)); return; }

    async.series([
        // githubのissue削除
        function (next) {
            if (token && project.github && project.github.sync) {
                (new GitHub(token)).closeIssue(project.github.repoName, project.github.userName, issue, next);
            } else {
                next(null);
            }
        },
        // issue削除
        function (next) {
            project.issues.pull(issue);
            project.save(function (err, data) {
                project = data;
                next(err);
            });
        }
    ], function (err) {
        if (err) { callback(err); return; }
        callback(err, project, issue);
    });
});

/*** /issue ***/

Projects.method('assign', function (token, issueId, userId, callback) {
    var project = this;
    var GitHub = require('./github');
    var username = null;

    // issue取り出し
    var issue = _.find(project.issues, function (issue) {
        return String(issue._id) === String(issueId);
    });
    if (!issue) { callback(new Error('undefined issue id: ' + issueId)); return; }

    // member取り出し
    var member = _.find(project.members, function (member) {
        return String(member.user) === userId;
    });

    // 更新情報
    var src = {
        assignee: member ? userId : null, // 見つからない = アサインを取り消す
        stage: member ? stages.todo : stages.backlog // アサイン直後は必ずTODO, アサインから外したらbacklog
    };

    async.series([
        // メンバー名の取得
        function (next) {
            if (!member) { next(null); return; }
            User.findById(userId, function (err, user) {
                username = user.userName;
                next(err);
            });
        },
        // githubのassign hook
        function (next) {
            if (token && project.github && project.github.sync) {
                (new GitHub(token)).assignIssue(project.github.repoName, project.github.userName, issue, username, next);
            } else {
                next(null);
            }
        },
        // assign
        function (next) {
            issue.assignee = member ? userId : null;
            issue.stage = member ? stages.todo : stages.backlog;
            _.extend(issue, src);
            project.save(function (err, data) {
                project = data;
                next(err);
            });
        }
    ], function (err) {
        if (err) { callback(err); return; }
        callback(err, project, issue);
    });
});

Projects.method('updateStage', function (issueId, toStage, callback) {
    var project = this;

    var issue = _.find(project.issues, function (issue) {
        console.log(issue._id);
        return String(issue._id) === String(issueId);
    });
    if (!issue) { callback(new Error('undefined issue id: ' + issueId)); return; }

    // TODO: assignee check if next stage is in todo, doing, done
    //if (!issue.assignee) { callback(new Error('issue not assigned: ' + issueId)); return; }

    // TODO: validate stage
    issue.stage = toStage;

    project.save(function (err, project) {
        if (err) { callback(err); return; }
        callback(err, project, issue);
    });
});

Projects.method('updateIssueDetail', function (token, issueId, title, body, callback) {
    var project = this;
    var GitHub = require('./github');

    // issue取り出し
    var issue = _.find(project.issues, function (issue) {
        return String(issue._id) === String(issueId);
    });
    if (!issue) { callback(new Error('undefined issue id: ' + issueId)); return; }

    // 更新用オブジェクト
    var src = {};
    if (issue.title !== title) { src.title = title; }
    if (issue.body !== body) { src.body = body; }

    async.series([
        // githubのissueの更新
        function (next) {
            if (token && project.github && project.github.sync) {
                (new GitHub(token)).updateDetailIssue(project.github.repoName, project.github.userName, issue, src, next);
            } else {
                next(null);
            }
        },
        // issue更新
        function (next) {
            _.extend(issue, src);
            project.save(function (err, data) {
                project = data;
                next(err);
            });
        }
    ], function (err) {
        if (err) { callback(err); return; }
        callback(err, project, issue);
    });
});

Projects.static('exists', function (where, callback) {
    this.count(where, function (err, count) {
        if (err) { callback(err); return; }
        callback(null, !!count);
    });
});

/*** helper ***/

function methodToStatic(methodName/* ,args..., callback */) {
    return function (projectWhere) {
        var callback = arguments[arguments.length - 1];
        var args = Array.prototype.splice.call(arguments, 1);

        this.findOne(projectWhere, function (err, project) {
            if (err) { callback(err); return; }
            if (!project) { callback(new Error('undefined project')); return; }

            project[methodName].apply(project, args);
        });
    };
}

/*** /helper **/

['addMember', 'removeMember', 'addIssue', 'removeIssue', 'assign', 'updateStage', 'updateIssueDetail'].forEach(function (methodName) {
    Projects.static(methodName, methodToStatic(methodName));
});

if (!mongoose.models.Project) { module.exports = mongoose.model('Project', Projects); }
else { module.exports = mongoose.model('Project'); }