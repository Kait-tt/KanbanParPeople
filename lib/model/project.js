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
            accessLevel: { type: String, default: 1, required: true },
            wipLimit: { type: Number, default: 4, required: true }
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

Projects.method('updateMember', function (userName, updateParams, callback) {
    var project = this;

    project.populate('members.user', function (err, project) {
        if (err) { callback(err); return; }

        var member = _.find(project.members, function (member) {
            return String(member.user.userName) === String(userName);
        });
        if (!member) { callback(new Error('undefined member name: ' + userName)); return; }

        _.each(updateParams, function (value, key) {
            member[key] = value;
        });

        project.save(function (err, project) {
            if (err) { callback(err); return; }

            callback(err, project, member);
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
        function (next) {
            // github hook create issue
            if (token && project.github && project.github.sync) {
                (new GitHub(token)).createIssue(project.github.repoName, project.github.userName, params, next);
                issue = null;
            } else {
                // create issue
                async.series([
                    // issue作成
                    function (next) {
                        if (issue) { next(null); return; }
                        Issue.create(params, function (err, doc) {
                            issue = doc;
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
                ], next);
            }
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
        function (next) {
            // githubのissue削除
            if (token && project.github && project.github.sync) {
                (new GitHub(token)).closeIssue(project.github.repoName, project.github.userName, issue, next);
                issue = null;
            } else {
                // issue削除
                project.issues.pull(issue);
                project.save(function (err, data) {
                    project = data;
                    next(err);
                });
            }
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
        assignee: member ? userId : null // 見つからない = アサインを取り消す
    };
    // アサイン直後は必ずTODO
    if (member) {
        src.stage = stages.todo;
    }
    // アサインから外したら、issue, done 以外だったら backlog にする
    if (!member && !src.stage && !_.contains([stages.issue, stages.done], issue.stage)) {
        src.stage = stages.backlog;
    }

    async.series([
        // メンバー名の取得
        function (next) {
            if (!member) { next(null); return; }
            User.findById(userId, function (err, user) {
                username = user.userName;
                next(err);
            });
        },
        function (next) {
            if (token && project.github && project.github.sync) {
                // githubのassign hook
                (new GitHub(token)).assignIssue(project.github.repoName, project.github.userName, issue, username, next);
                issue = null;
            } else {
                // assign
                _.extend(issue, src);
                project.save(function (err, data) {
                    project = data;
                    next(err);
                });
            }
        }
    ], function (err) {
        if (err) { callback(err); return; }
        callback(err, project, issue);
    });
});

Projects.method('updateStage', function (issueId, toStage, callback) {
    var project = this;

    var issue = _.find(project.issues, function (issue) {
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

Projects.method('updateIssuePriority', function (issueId, toPriority, callback) {
    var project = this;

    var issue = _.find(project.issues, function (issue) {
        return String(issue._id) === String(issueId);
    });
    if (!issue) { callback(new Error('undefined issue id: ' + issueId)); return; }

    var beforePriority = project.issues.indexOf(issue);
    var nextPriority = toPriority + (beforePriority >= toPriority ? 1 : 0);

    project.issues.splice(beforePriority, 1);
    project.issues.splice(nextPriority, 0, issue);

    project.save(function (err, project) {
        if (err) { callback(err); return; }
        callback(err, project, issue, toPriority);
    });
});

Projects.static('exists', function (where, callback) {
    this.count(where, function (err, count) {
        if (err) { callback(err); return; }
        callback(null, !!count);
    });
});

Projects.method('findIssue', function (predicate, callback) {
    var issue = _.find(this.issues, predicate);
    callback(null, issue);
});

Projects.method('findIssueById', function (issueId, callback) {
    var issue = _.find(this.issues, function (issue) {
        return String(issue._id) === issueId;
    });
    if (callback) { callback(null, issue, this); }
    return issue;
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

['addMember', 'removeMember', 'updateMember', 'addIssue', 'removeIssue', 'assign', 'updateStage',
    'updateIssueDetail', 'findIssue', 'findIssueById', 'updateIssuePriority'].forEach(function (methodName) {
    Projects.static(methodName, methodToStatic(methodName));
});

if (!mongoose.models.Project) { module.exports = mongoose.model('Project', Projects); }
else { module.exports = mongoose.model('Project'); }