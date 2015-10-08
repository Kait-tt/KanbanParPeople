var async = require('async');
var _ = require('lodash');
var GitHubApi = require('github');
var Project = require('./project');
var User = require('./user');
var Issue = require('./issue');
var stages = require('./stages');
var config = require('config');
var request = require('request');
var fs = require('fs');

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

GitHub.prototype.addLabel = function (repo, user, params, callback) {
    this.api.issues.createLabel({
        repo: repo,
        user: user,
        name: params.name,
        color: params.color
    }, callback);
};

GitHub.prototype.removeLabel = function (repo, user, params, callback) {
    this.api.issues.deleteLabel({
        repo: repo,
        user: user,
        name: params.name
    }, callback);
};

GitHub.prototype.fetchLabels = function (repo, user, callback) {
    this.api.issues.getLabels({
        // labelが101個以上ある場合はpageを巡らないといけないが、そんなに作ることはないと思われるので考慮しない
        repo: repo,
        user: user,
        per_page: 100 // max
    }, callback);
};

GitHub.prototype.createHook = function (repo, user, projectId, callback) {
    this.api.repos.createHook({repo: repo, user: user,
        name: 'web',
        config: {
            "url": config.get('github.hookURL').replace(':id', projectId),
            "content_type": "json"
        },
        events: ['issues', 'member'],
        active: true
    }, callback);
};

GitHub.prototype.deleteHook = function (repo, user, hookId, callback) {
    this.api.repos.deleteHook({
        user: user,
        repo: repo,
        id: hookId
    }, callback);
};

GitHub.prototype.fetchUserAvatar = function (usernames, callback) {
    var github = this;

    async.map(usernames, function (username, next) {
        github.api.user.getFrom({user: username}, function (err, res) {
            if (err) { return next(err); }
            github.saveUserAvatar(username, res.avatar_url, function (err, path) {
                next(null, {url: res.avatar_url, path: path});
            });
        });
    }, function (err, avatarUrls) {
        if (err) { return callback(err); }
        callback(null, avatarUrls);
    });
};

GitHub.prototype.saveUserAvatar = function (username, url, callback) {
    var path = __dirname + '/../../public/images/avatar/' + username + '.';
    request.get(url, {encoding: null}, function (err, res, body) {
        if (err) { return callback(err); }
        var contentType = res.headers['content-type'];
        if (!contentType) { return callback('content-type header is not found'); }
        var slashPos = contentType.indexOf('/');
        if (!slashPos) { return callback('invalid content-type header'); }
        path += contentType.substr(slashPos + 1);

        fs.writeFile(path, body, function (err) {
            callback(err, path);
        });
    });
};

GitHub.findIssueByNumber = function (project, issueNumber) {
    return _.find(project.issues, function (issue) {
        return issue.github && issue.github.number === String(issueNumber);
    });
};

GitHub.prototype.importProject = function (userName, repoName, createUserName, callback) {
    var github = this;

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
            },

            // modify WIP limit
            function (next) {
                project.members.forEach(function (member) {
                    var wip = project.issues.filter(function (issue) {
                        return String(issue.assignee) === String(member.user);
                    }).length;
                    member.wipLimit = Math.max(member.wipLimit, wip);
                });
                next();
            },

            // hook
            function (next) {
                github.createHook(repoName, userName, project.id, function (err, res) {
                    if (err) { return next(err);}
                    project.github.hook = {id: res.id};
                    next(null);
                });
            },

            // save project
            function (next) {
                project.save(next);
            }
        ], function (err) {
            callback(err, project);
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
            url: issue.html_url
        },
        created_at: new Date(issue.created_at),
        updated_at: new Date(issue.updated_at)
    };

    var assignee = issue.assignee;

    // state
    if (issue.state === 'open') {
        params.stage = assignee ? stages.todo : stages.issue;
    } else {
        params.stage = stages.archive;
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