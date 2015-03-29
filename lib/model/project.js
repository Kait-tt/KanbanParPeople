var _ = require('underscore');
var string = require('../module/util/string');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var Issue = require('./issue');
var User = require('./user');

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
        url: { type: String }
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
Projects.method('addIssue', function (params, callback) {
    var project = this;

    Issue.create(params, function (err, issue) {
        if (err) { callback(err); return; }

        project.issues.unshift(issue);

        project.save(function (err, project) {
            if (err) { callback(err); return; }

            callback(err, project, issue);
        });
    });
});

Projects.method('removeIssue', function (issueId, callback) {
    var project = this;

    var issue = _.find(project.issues, function (issue) {
        return String(issue._id) === String(issueId);
    });
    if (!issue) { callback(new Error('undefined issue id: ' + issueId)); return; }

    project.issues.pull(issue);

    project.save(function (err, project) {
        if (err) { callback(err); return; }

        callback(err, project, issue);
    });
});

/*** /issue ***/

/*** assign **/

Projects.method('assign', function (issueId, userId, callback) {
    var project = this;

    var issue = _.find(project.issues, function (issue) {
        return String(issue._id) === String(issueId);
    });
    if (!issue) { callback(new Error('undefined issue id: ' + issueId)); return; }

    var member = _.find(project.members, function (member) {
        return String(member.user) === userId;
    });
    if (!member) { callback(new Error('undefined member id: ' + memberId)); return; }

    issue.assignee = userId;
    issue.stage = 'todo';

    project.save(function (err, project) {
        if (err) { callback(err); return; }

        callback(err, project, issue);
    });
});

/*** /assign **/

Projects.static('exists', function (where, callback) {
    this.count(where, function (err, count) {
        if (err) { callback(err); return; }
        callback(null, !!count);
    });
});

/*** helper ***/

function methodToStatic(methodName, projectWhere/* ,args..., callback */) {
    return function () {
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

['addMember', 'removeMember', 'addIssue', 'removeIssue', 'assign'].forEach(function (methodName) {
    Projects.static(methodName, methodToStatic(methodName));
});

if (!mongoose.models.Project) { module.exports = mongoose.model('Project', Projects); }
else { module.exports = mongoose.model('Project'); }