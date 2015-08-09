var _ = require('lodash');
var async = require('async');
var string = require('../module/util/string');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var Issue = require('./issue');
var User = require('./user');
var stages = require('./stages');
var ew = require('../module/util/asyncWrap').errorWrap;
var hooks = {github: require('./hook/github')};

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
        .exec(ew(callback, function (docs) {
            if (o.one) {
                callback(null, docs.length ? docs[0] : null);
            } else {
                callback(null, docs);
            }
        }));
});

/*** member ***/
// もし存在しないユーザなら作成する
Projects.method('addMember', function (userName, callback) {
    var project = this;

    User.findOrCreate(userName, ew(callback, function (user) {
        if (project.findMemberById(user._id)) { return callback(new Error('already added member')); }

        project.members.unshift({user: user});

        project.save(ew(callback, function (project) {
            project.populate('members.user', ew(callback, function (project) {
                callback(null, project, project.members[0]);
            }));
        }));
    }));
});

// メンバーに対して何か操作する
Projects.method('operationMember', function (userName, predecate, callback) {
    var project = this;

    project.populate('members.user', ew(callback, function (project) {
        var member = project.findMemberByName(userName);
        if (!member) { return callback(new Error('undefined member name: ' + userName)); }

        predecate(project, member);

        project.save(ew(callback, function (project) {
            callback(null, project, member);
        }));
    }));
});

Projects.method('removeMember', function (userName, callback) {
    this.operationMember(userName, function (project, member) {
        project.members.pull(member);
    }, callback);
});

Projects.method('updateMember', function (userName, updateParams, callback) {
    this.operationMember(userName, function (project, member) {
        _.each(updateParams, function (value, key) {
            member[key] = value;
        });
    }, callback);
});

/*** /member ***/

/*** issue ***/
Projects.method('addIssue', function (token, params, callback) {
    var project = this;

    project.eachHooks('addIssue', {github: token}, params,
        ew(callback, function (results) { // any done
            callback(null, project, null);
        }), function () { // all skiped
            Issue.create(params, ew(callback, function (issue) {
                project.issues.unshift(issue);
                project.save(ew(callback, function (project) {
                    callback(null, project, issue);
                }));
            }));
        });
});

Projects.method('removeIssue', function (token, issueId, callback) {
    var project = this;

    // issue取り出し
    var issue = project.findIssueById(issueId);
    if (!issue) { return callback(new Error('undefined issue id: ' + issueId)); }

    project.eachHooks('removeIssue', {github: token}, {issue: issue},
        ew(callback, function (results) { // any done
            callback(null, project, null);
        }), function () { // all skiped
            project.issues.pull(issue);
            project.save(ew(callback, function (project) {
                callback(null, project, issue);
            }));
        });
});

// ステージとアサインを更新する
Projects.method('updateStage', function (token, issueId, toStage, userId, callback) {
    var project = this;

    var GitHub = require('./github'); // 先頭でrequireしたら依存関係でエラー
    var username = null;

    // issue取り出し
    var issue = this.findIssueById(issueId);
    if (!issue) { callback(new Error('undefined issue id: ' + issueId)); return; }

    // member取り出し
    var member = this.findMemberById(userId);

    async.series([
        // メンバー名の取得
        function (next) {
            if (!member) { next(null); return; }
            User.findById(userId, function (err, user) {
                username = user.userName;
                next(err);
            });
        },
        // 更新
        function (next) {
            if (token && project.github && project.github.sync) {
                // githubのassign hook
                (new GitHub(token)).assignIssue(project.github.repoName, project.github.userName, issue, username, next);
                issue = null;
            } else {
                // update
                issue.assignee = member ? userId : null; // メンバーがいない = アサインを取り消す
                issue.stage = toStage;
                project.save(function (err, doc) {
                    project = doc;
                    next(err);
                });
            }
        }
    ], function (err) {
        if (err) { callback(err); return; }
        callback(err, project, issue);
    });
});

Projects.method('updateIssueDetail', function (token, issueId, title, body, callback) {
    var project = this;
    var GitHub = require('./github');

    // issue取り出し
    var issue = this.findIssueById(issueId);
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
    var nextPriority = toPriority + (beforePriority < toPriority ? 0 : 0); // TODO

    // don't have to update
    if (beforePriority === nextPriority) {
        return callback(null, project, issue, toPriority);
    }

    project.issues.splice(beforePriority, 1);
    project.issues.splice(nextPriority, 0, issue);

    project.save(function (err, project) {
        if (err) { callback(err); return; }
        callback(err, project, issue, toPriority);
    });
});

/*** /issue ***/

Projects.static('exists', function (where, callback) {
    this.count(where, function (err, count) {
        if (err) { callback(err); return; }
        callback(null, !!count);
    });
});

Projects.method('findIssue', function (predicate, callback) {
    var issue = _.find(this.issues, predicate);
    if (callback) { callback(null, issue); }
    return issue;
});

Projects.method('findIssueById', function (issueId, callback) {
    return this.findIssue(function (issue) {
        return String(issue._id) === String(issueId);
    }, callback);
});

Projects.method('findMember', function (predicate, callback) {
    var member = _.find(this.members, predicate);
    if (callback) { callback(null, member); }
    return member;
});

Projects.method('findMemberById', function (userId, callback) {
    return this.findMember(function (member) {
        return String(member.user) === String(userId);
    }, callback);
});

Projects.method('findMemberByName', function (userName, callback) {
    return this.findMember(function (member) {
        return String(member.user.userName) === String(userName);
    }, callback);
});

Projects.method('eachHooks', function (methodName, tokens, args, anyDoneCallback, allSkipedCallback) {
    var project = this;

    async.series(_.map(hooks, function (Hook, hookName) {
        return function (next) {
            var token = tokens[hookName];
            if (!token || !Hook || !Hook.isHooked(project) || !Hook.prototype[methodName]) {
                return next(null);
            }

            (new Hook(token))[methodName](project, args, next);
        };
    }), function (err, results) {
        if (err) {
            if (anyDoneCallback) { anyDoneCallback(err); }
        } else if(_.every(results, _.negate(Boolean))) {
            if (allSkipedCallback) { allSkipedCallback(); }
        } else {
            anyDoneCallback(null, results);
        }
    });
});

Projects.method('findMemberById', function (memberId, callback) {
    var member = _.find(this.members, function (member) {
        return String(member.user) === String(memberId);
    });
    if (callback) { callback(null, member, this); }
    return member;
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