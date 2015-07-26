var async = require('async');
var _ = require('underscore');
var GitHubApi = require('github');
var Project = require('./project');
var User = require('./user');
var Issue = require('./issue');
var stages = require('./stages');

function GitHub (token) {
    this.api = new GitHubApi({
        version: '3.0.0'
    });

    if (token) {
        this.api.authenticate({
            type: 'oauth',
            token: token
        });
    }
}

GitHub.prototype.createIssue = function (repo, user, issueParams, callback) {
    // params must be includes title, body, repo, user;

    this.api.issues.create(_.extend({labels: []}, issueParams, {repo: repo, user: user}), function (err, issue) {
        if (err) { callback(err); return; }

        var issueObj = new Issue({
            title: issue.title,
            body: issue.body,
            stage: stages.issue,
            assignee: null,
            github: {
                number: issue.number,
                url: issue.html_url
            },
            created_at: new Date(issue.created_at),
            updated_at: new Date(issue.updated_at)
        });

        callback(null, issueObj);
    });
};

GitHub.prototype.closeIssue = function (repo, user, issue, callback) {
    if (!issue.github) {
        callback(new Error('issue do not have github data'));
        return;
    }

    this.api.issues.edit({repo: repo, user: user, number: issue.github.number, state: 'closed'}, callback);
};

GitHub.prototype.updateDetailIssue = function (repo, user, issue, detail, callback) {
    if (!issue.github) {
        callback(new Error('issue do not have github data'));
        return;
    }

    this.api.issues.edit(
        _.extend({repo: repo, user: user, number: issue.github.number}, _.pick(detail, 'title', 'body')),
        callback);
};

GitHub.prototype.assignIssue = function (repo, user, issue, username, callback) {
    if (!issue.github) {
        callback(new Error('issue do not have github data'));
        return;
    }

    this.api.issues.edit({repo: repo, user: user, number: issue.github.number, assignee: username}, callback);
};

GitHub.prototype.importProject = function (userName, repoName, createUserName, callback) {
    getRepository.call(this, userName, repoName, function (err, repo) {
        if (err) { callback(err); return; }

        var project = new Project({
            name: repoName,
            github: repo.repository,
            members: [],
            issues: [],
            create_user: null
        });

        async.series([
            // find create_user
            function (next) {
                User.findOne({userName: createUserName}).exec(function (err, user) {
                    if (err) { next(err); return; }
                    if (user === null) { next(new Error('not found create user: ' + createUserName)); return; }
                    project.create_user = user._id;
                    next(null);
                });
            },

            // create or find members
            function (next) {
                async.map(repo.members, User.findOrCreate.bind(User), function (err, members) {
                    if (err) { next(err); return; }

                    // project#member用に整形
                    project.members = members.map(function (member) {
                        return { user: member };
                    });

                    next(null);
                });
            },

            // create issues
            function (next) {
                async.map(repo.issues, GitHub.serializeIssue, function (err, issues) {
                    if (err) { next(err); return; }

                    project.issues = issues;
                    next(null);
                });
            }
        ], function (err) {
            // save project
            if (err) { callback(err); return; }

            project.save(callback);
        });
    });
};

// github issue -> my app issue
GitHub.serializeIssue = function (issue, callback) {
    var params = {
        title: issue.title,
        body: issue.body,
        assignee: null,
        stage: null,
        github: {
            number: issue.number,
            url: issue.url
        },
        created_at: new Date(issue.created_at),
        updated_at: new Date(issue.updated_at)
    };

    var assignee = issue.assignee;

    // state
    if (issue.state === 'open') {
        params.stage = assignee ? stages.todo : stages.issue;
    } else {
        params.stage = stages.done;
    }

    // assignee
    if (assignee && params.stage === stages.todo) {
        User.findOrCreate(assignee.login, function (err, user) {
            if (err) { callback(err); }
            else {
                params.assignee = user._id;
                callback(null, params);
            }
        });
    } else {
        callback(null, params);
    }
};

// repoのissuesを取得して、システム用に整形して返す
function getRepository (userName, repoName, callback) {
    // 最終的に返すデータ
    var repo = {
        repository: {
            userName: userName,
            repoName: repoName,
            url: 'https://github.com/' + userName + '/' + repoName
        },
        issues: [],
        members: []
    };

    var api = this.api;

    async.parallel({
        // get members
        members: function (next) {
            api.repos.getCollaborators({
                user: userName,
                repo: repoName,
                per_page: 100
            }, function (err, data) {
                if (err) { next(err); }
                else { next(null, _.pluck(data, 'login')); }
            });
        },

        // get issues
        issues: function (next) {
            getIssues(api, {
                user: userName,
                repo: repoName,
                state: 'all'
            }, next);
        }
    }, function (err, results) {
        if (err) { callback(err); return; }

        repo.issues = results.issues;
        repo.members = results.members;

        callback(null, repo);
    });
}

function getIssues(api, o, callback) {
    o = _.defaults(o || {}, {
        state: 'all',
        page: 1,
        per_page: 100
    });

    api.issues.repoIssues(o, function (err, data) {
        if (err) { callback(err); return; }

        var issues = [];

        Array.prototype.push.apply(issues, data
            .filter(function (issue) { // pull-requestは無視
                return issue.pull_request === undefined;
            }));

        var next = getNext(data.meta);
        if (next) {
            // pageが終わるまで取る
            getIssues(api, _.defaults({page: next}, o), function (err, nextIssues) {
                if (err) { next(err); return; }

                Array.prototype.push.apply(issues, nextIssues);
                callback(null, issues);
            });
        } else {
            callback(null, issues);
        }
    });
}

function getNext(meta) {
    if (!meta || !meta.link) { return null; }

    var regex = /\<.+?\&page=(\d+).*?\>; rel="next"/;
    var lines = meta.link.split(',');
    var i, next;

    for (i = 0; i < lines.length; i++) {
        next = regex.exec(lines[i]);
        if (next) {
            return Number(next[1]);
        }
    }

    return null;
}

module.exports = GitHub;