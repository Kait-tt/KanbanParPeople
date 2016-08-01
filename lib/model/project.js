var _ = require('lodash');
var async = require('async');
var string = require('../module/util/string');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var Issue = require('./issue');
var User = require('./user');
var Label = require('./label');
var stages = require('./stages');
var stageTypes = require('./stageTypes');
var ew = require('../module/util/asyncWrap').errorWrap;
var hooks = {github: require('./hook/github')};
var moveToBefore = require('../module/util/array').moveToBefore;

var ID_LENGTH = 12;
var defaultCost = 3;

var createID = string.createRandomCode.bind(string, ID_LENGTH);

var Projects = new Schema({
    id: { type: String, default: createID, required: true },
    name: { type: String, required: true },
    members: [
        {
            user: { type: ObjectId, ref: 'User', required: true },
            created_at: { type: Date, default: Date.now, required: true },
            accessLevel: { type: String, default: 1, required: true },
            visible: { type: Boolean, default: true, required: true },
            wipLimit: { type: Number, default: 12, required: true }
        }
    ],
    issues: [Issue.schema],
    labels: [Label.schema],
    github: {  // option
        userName: { type: String },
        repoName: { type: String },
        url: { type: String },
        sync: { type: Boolean, default: true, required: true },
        hook: {
            id: { type: String }
        },
        token: { type: String }
    },
    create_user: { type: ObjectId, ref: 'User', required: true },
    created_at: { type: Date, default: Date.now, required: true }
});

// labels.names は uniqueになってるか
Projects.pre('save', function (next) {
    var labelNames = _.map(this.labels, 'name');
    if (labelNames.length !== _.uniq(labelNames).length) {
        next(new Error('required label names is uniqued'));
    }
    next();
});

// issueに付加されているlabelはprojectに存在するlabelか
Projects.pre('save', function (next) {
    var labelIds = _.chain(this.labels)
        .map(function (label) { return [String(label._id), true]; })
        .fromPairs()
        .value();

    this.issues.forEach(function (issue) {
        if (issue.labels) {
            issue.labels.forEach(function (labelId) {
                if (!labelIds[String(labelId)]) {
                    next(new Error('required label attached to issue is included'));
                }
            });
        }
    });

    next();
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

Projects.static('findPopulatedByMemberName', function (username, callback) {
    // find queryで取り出せないので、とりあえず全部取ってきちゃう
    this.findPopulated({}, {}, function (err, docs) {
        if (err) { return callback(err); }
        var containMembers = docs.filter(function (project) {
            return _.some(project.members, function (member) {
                return String(member.user.userName) === String(username);
            });
        });
        callback(null, containMembers);
    });
});

/*** member ***/
// もし存在しないユーザなら作成する
describe('addMember', function (userName, callback) {
    var project = this;

    User.findOrCreate(userName, ew(callback, function (user) {
        if (project.findMemberById(user._id)) { return callback(new Error('already added member')); }

        project.members.push({user: user});

        project.save(ew(callback, function (project) {
            project.populate('members.user', ew(callback, function (project) {
                callback(null, project, project.members[project.members.length - 1]);
            }));
        }));
    }));
});

// メンバーに対して何か操作する
describe('operationMember', function (userName, predecate, callback) {
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

describe('removeMember', function (userName, callback) {
    this.operationMember(userName, function (project, member) {
        project.members.pull(member);
    }, callback);
});

describe('updateMember', function (userName, updateParams, callback) {
    this.operationMember(userName, function (project, member) {
        _.each(updateParams, function (value, key) {
            member[key] = value;
        });
    }, callback);
});

describe('updateMemberOrder', function (userName, insertBeforeOfUserName, callback) {
    this.populate('members.user', ew(callback, function (project) {
        var target = project.findMemberByName(userName);
        if (!target) { return callback(new Error('undefined member name: ' + userName)); }

        var insertBefore = null;
        if (insertBeforeOfUserName) {
            insertBefore = project.findMemberByName(insertBeforeOfUserName);
            if (!insertBefore) { return callback(new Error('undefined insert before of member name: ' + insertBeforeOfUserName)); }
        }

        moveToBefore(project.members, target, insertBefore);

        project.save(function (err, project) {
            if (err) { return callback(err); }
            callback(err, project, target, insertBefore);
        });
    }));
});

/*** /member ***/

/*** issue ***/
describe('addIssue', function (token, params, callback) {
    var project = this;

    project.eachHooks('addIssue', {github: token}, params,
        // any done
        function (err, results, result) {
            Issue.create(result, ew(callback, function (issue) {
                project.issues.unshift(issue);
                project.save(ew(callback, function (project) {
                    callback(null, project, issue);
                }));
            }));
        },
        // all skipped
        function () {
            // TODO: labelsがparamsに含まれているとエラー出るので注意
            Issue.create(params, ew(callback, function (issue) {
                project.issues.unshift(issue);
                project.save(ew(callback, function (project) {
                    callback(null, project, issue);
                }));
            }));
        });
});

describe('removeIssue', function (token, issueId, callback) {
    // remove equals archive
    this.updateStage(token, issueId, stages.archive, null, callback);
});

// ステージとアサインを更新する
describe('updateStage', function (token, issueId, toStage, userId, callback) {
    var project = this;

    // issue取り出し
    var issue = this.findIssueById(issueId);
    if (!issue) { return callback(new Error('undefined issue id: ' + issueId)); }

    // member取り出し
    var toMember = this.findMemberById(userId);
    if (userId && !toMember) {
        return callback(new Error('undefined user id in this project: ' + userId));
    }

    // 作業中は変更をリジェクト
    if (issue.isWorking) { return callback(new Error('working issue cannot be updated stage or assignee')); }

    // WIPLimitチェック
    if (userId && String(userId) !== String(issue.assignee)) {
        if (toMember.wip + (issue.cost ? issue.cost : defaultCost) > toMember.wipLimit) {
            return callback('wip limit over. cannot update stage or/and assign');
        }
    }

    var currentStage = issue.stage;
    issue.assignee = userId;
    issue.stage = toStage;
    project.save(function (err, doc) {
        if (err) { return callback(err); }
        callback(err, doc/*is project*/, issue);
        project.eachHooks('assignIssue', {github: token}, {issue: issue, userId: userId});
        if (stageTypes[currentStage].state !== stageTypes[toStage].state) {
            project.eachHooks('updateState', {github: token}, {issue: issue, state: stageTypes[toStage].state});
        }
    });
});

describe('updateIssueDetail', function (token, issueId, title, body, cost, callback) {
    var project = this;
    var GitHub = require('./github');

    // issue取り出し
    var issue = this.findIssueById(issueId);
    if (!issue) { callback(new Error('undefined issue id: ' + issueId)); return; }

    // 更新用オブジェクト
    var src = {};
    if (issue.title !== title) { src.title = title; }
    if (issue.body !== body) { src.body = body; }
    if (issue.cost !== cost) { src.cost = cost; }

    _.extend(issue, src);
    project.save(function (err, project) {
        callback(err, project, issue);
        if (!err) { project.eachHooks('updateDetailIssue', {github: token}, {issue: issue, detail: src}); }
    });
});

describe('updateIssueWorkingState', function (issueId, isWorking, callback) {
    var project = this;

    // issue取り出し
    var issue = this.findIssueById(issueId);
    if (!issue) { callback(new Error('undefined issue id: ' + issueId)); return; }

    if (issue.isWorking === isWorking) { return callback(null, project, issue); } // not update

    if (isWorking) { // off -> on
        if (!issue.assignee) { return callback('issue is not assigned. it is necessary to assign to start to work.'); }
        issue.isWorking = isWorking;
        issue.workHistory.push({
            startTime: new Date(),
            isEnded: false,
            userId: issue.assignee
        });
    } else { // on -> off
        if (!issue.workHistory.length) { return callback('issue is not started to work.'); }
        var lastHistory = issue.workHistory[issue.workHistory.length - 1];
        if (lastHistory.isEnded) { return callback('issue is not started to work.'); }
        issue.isWorking = isWorking;
        lastHistory.isEnded = true;
        lastHistory.endTime = new Date();
    }

    project.save(function (err, project) {
        callback(err, project, issue);
    });
});

// 作業履歴を"全て"更新する
// 作業中は更新できない。
describe('updateIssueWorkHistory', function (issueId, workHistory, callback) {
    var project = this;

    // issue取り出し
    var issue = this.findIssueById(issueId);
    if (!issue) { return callback(new Error('undefined issue id: ' + issueId)); }

    // 作業中は更新できない
    if (issue.isWorking) { return callback(new Error('cannot update working history of working issue.')); }

    issue.workHistory = workHistory;

    project.save(function (err, project) {
        callback(err, project, issue);
    });
});

describe('updateIssuePriority', function (issueId, insertBeforeOfIssueId, callback) {
    var project = this;

    var targetIssue = project.findIssueById(issueId);
    if (!targetIssue) { return callback(new Error('undefined issue id: ' + issueId)); }

    var insertBeforeOfIssue = null;
    if (insertBeforeOfIssueId) {
        insertBeforeOfIssue = project.findIssueById(insertBeforeOfIssueId);
        if (!insertBeforeOfIssue) { return callback(new Error('undefined insert before of issue id: ' + insertBeforeOfIssueId)); }
    }

    moveToBefore(project.issues, targetIssue, insertBeforeOfIssue);

    project.save(function (err, project) {
        if (err) { return callback(err); }
        callback(err, project, targetIssue, insertBeforeOfIssueId);
    });
});

/*** /issue ***/

/*** label ***/

describe('addLabel', function (token, params, callback) {
    var project = this;

    project.eachHooks('addLabel', {github: token}, params,
        // any done
        function (err, results) {
            callback(null, project, null);
        },
        // all skipped
        function () {
            Label.create(params, ew(callback, function (label) {
                project.labels.push(label);
                project.save(ew(callback, function (project) {
                    callback(null, project, label);
                }));
            }));
        });
});

describe('removeLabel', function (token, labelName, callback) {
    var project = this;

    project.eachHooks('addLabel', {github: token}, {name: labelName},
        // any done
        function (err, results) {
            callback(null, project, null);
        },
        // all skipped
        function () {
            project.findLabelByName(labelName, ew(callback, function (label) {
                project.labels.pull(label);
                project.save(ew(callback, function (project ) {
                    callback(null, project, label);
                }));
            }));
        });
});

describe('attachLabel', function (token, issueId, labelName, callback) {
    var project = this;

    // issue取り出し
    var issue = project.findIssueById(issueId);
    if (!issue) { return callback(new Error('undefined issue id: ' + issueId)); }

    // labelの取り出し
    var label = project.findLabelByName(labelName);
    if (!label) { return callback(new Error('undefined label name: ' + labelName)); }

    project.eachHooks('attachLabel', {github: token}, {issue: issue, label: label},
        // any done
        function (err, resutls) {
            callback(err, project, null);
        },
        // all skipped
        function () {
            issue.labels.push(label._id);

            project.save(function (err, project) {
                callback(err, project, issue, label);
            });
        }
    );
});

describe('detachLabel', function (token, issueId, labelName, callback) {
    var project = this;

    // issue取り出し
    var issue = project.findIssueById(issueId);
    if (!issue) { return callback(new Error('undefined issue id: ' + issueId)); }

    // labelの取り出し
    var label = project.findLabelByName(labelName);
    if (!label) { return callback(new Error('undefined label name: ' + labelName)); }

    // issueはlabelを持っているか
    if (!issue.labels.some(function (labelId) { return String(labelId) === String(label._id); })) {
        return callback(new Error('issue do not has label: ' + issue.title + ', ' + labelName));
    }

    project.eachHooks('detachLabel', {github: token}, {issue: issue, label: label},
        // any done
        function (err, resutls) {
            callback(err, project, null);
        },
        // all skipped
        function () {
            issue.labels.remove(label._id);

            project.save(function (err, project) {
                callback(err, project, issue, label);
            });
        }
    );
});

// issue.labelsの中身を展開したものを返す
describe('expandIssueLabel', function (issue) {
    var project = this;
    return issue.labels.map(function (labelId) {
        return project.findLabelById(labelId);
    });
});

// ラベル更新の必要性をチェック
// 今はとりあえずlabelが同一かを確認しているが、本当はissueのラベル状態も確認する必要がある
describe('checkNeedUpdateLabels', function (newLabels, newIssues) {
    return !_.isEqual(format(this.labels), format(newLabels));

    function format(labels) {
        return _.chain(labels)
            .map(function (x) { return _.pick(x, 'name', 'color'); })
            .sortByAll(['name', 'color'])
            .value();
    }
});

/*** /label ***/

Projects.static('exists', function (where, callback) {
    this.count(where, function (err, count) {
        if (err) { callback(err); return; }
        callback(null, !!count);
    });
});

describe('findIssue', function (predicate, callback) {
    var issue = _.find(this.issues, predicate);
    if (callback) { callback(null, issue); }
    return issue;
});

describe('findIssueById', function (issueId, callback) {
    return this.findIssue(function (issue) {
        return String(issue._id) === String(issueId);
    }, callback);
});

describe('findMember', function (predicate, callback) {
    var member = _.find(this.members, predicate);
    if (callback) { callback(null, member); }
    return member;
});

describe('findMemberById', function (userId, callback) {
    return this.findMember(function (member) {
        return String(member.user._id ? member.user._id : member.user) === String(userId);
    }, callback);
});

describe('findMemberByName', function (userName, callback) {
    return this.findMember(function (member) {
        return String(member.user.userName) === String(userName);
    }, callback);
});

describe('findLabel', function (predicate, callback) {
    var label = _.find(this.labels, predicate);
    if (callback) { callback(null, label); }
    return label;
});

describe('findLabelById', function (labelId, callback) {
    return this.findLabel(function (label) {
        return String(label._id) === String(labelId);
    }, callback);
});

describe('findLabelByName', function (labelName, callback) {
    return this.findLabel(function (label) {
        return String(label.name) === String(labelName);
    }, callback);
});

describe('eachHooks', function (methodName, tokens, args, anyDoneCallback, allSkipedCallback) {
    var project = this;
    anyDoneCallback = anyDoneCallback || _.noop;
    allSkipedCallback = allSkipedCallback || _.noop;

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
            anyDoneCallback(err);
        } else if(_.every(results, _.negate(Boolean))) {
            allSkipedCallback();
        } else {
            var result = results ? _.find(results, function (x) { return x; }) : null;
            anyDoneCallback(null, results, result);
        }
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

function describe(name, func) {
    Projects.method(name, func);
    Projects.static(name, methodToStatic(name));
}

if (!mongoose.models.Project) { module.exports = mongoose.model('Project', Projects); }
else { module.exports = mongoose.model('Project'); }