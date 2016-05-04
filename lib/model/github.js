var async = require('async');
var _ = require('lodash');
var GitHubApi = require('github');
var Project = require('./project');
var User = require('./user');
var Issue = require('./issue');
var Label = require('./label');
var stages = require('./stages');
var config = require('config');
var request = require('request');
var fs = require('fs');
var octonode = require('octonode');

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

    this.octo = octonode.client(token);
}

GitHub.prototype.createIssue = function (repo, user, project, issueParams, callback) {
    // params must be includes title, body, repo, user;

    this.api.issues.create(_.extend({labels: []}, issueParams, {repo: repo, user: user}), function (err, issue) {
        if (err) { return callback(err); }

        GitHub.serializeIssue(project, issue, function (err, issue) {
            if (err) { return callback(err); }
            if (issueParams.stage) { issue.stage = issueParams.stage; }
            if (issueParams.cost)  { issue.cost = issueParams.cost; }
            callback(null, issue);
        });
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
        _.extend({repo: repo, user: user, number: issue.github.number}, _.pick(detail, 'title', 'body', 'state')),
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

GitHub.prototype.attachLabel = function (repo, user, issue, label, callback) {
    this.octo.post('/repos/' + user + '/' + repo + '/issues/' + issue.github.number + '/labels', [label.name],
        function(err, status, body, header) {
            if (err) { return callback(err); }
            if (status !== 200) { return callback(new Error('Attach label error')); }
            return callback(null, body, header);
        });
};

GitHub.prototype.detachLabel = function (repo, user, issue, label, callback) {
    this.octo.del('/repos/' + user + '/' + repo + '/issues/' + issue.github.number + '/labels/' + label.name, {},
        function(err, status, body, header) {
            if (err) { return callback(err); }
            if (status !== 204) { return callback(new Error('Detach label error')); }
            return callback(null, body, header);
        });
};

// ラベル更新の必要性をチェック
// 今はとりあえずlabelが同一かを確認しているが、本当はissueのラベル状態も確認する必要がある
GitHub.prototype.checkNeedUpdateLabels = function (repo, user, project, callback) {
    this.fetchLabels(repo, user, function (err, newLabels) {
        if (err) { return callback(err); }

        var res = project.checkNeedUpdateLabels(newLabels, []);
        callback(null, res);
    });
};

GitHub.prototype.fetchLabels = function (repo, user, callback) {
    this.api.issues.getLabels({
        // labelが101個以上ある場合はpageを巡らないといけないが、そんなに作ることはないと思われるので考慮しない
        repo: repo,
        user: user,
        per_page: 100 // max
    }, callback);
};

// GitHubを元にプロジェクトのラベル情報を同期する
// KanbanProjectが所持する既存のラベル情報はIssueに紐づけられているものを含めてすべて破棄する
// Issueの所持するlabelsを破棄するので、この後syncIssuesFromGitHubの実行を推奨する
GitHub.prototype.syncLabelsFromGitHub = function (repo, user, project, callback) {
    var github = this;

    github.fetchLabels(repo, user, function (err, newLabels) {
        if (err) { return callback(err); }

        // remove all label
        project.labels.splice(0);
        project.issues.forEach(function (issue) { issue.labels.splice(0); });

        // sync labels
        async.each(newLabels, function (labelParams, next) {
            Label.create(labelParams, function (err, label) {
                if (err) { return next(err); }
                project.labels.push(label);
                next(null);
            });
        }, function (err) {
            if (err) { return callback(err); }
            project.save(function (err, project) {
                callback(null, project, newLabels);
            });
        });
    });
};

// GitHubを元にプロジェクトのIssue情報を同期する
// syncKeysで指定されているカラム名のみ同期する
GitHub.prototype.syncIssuesFromGitHub = function (repo, user, project, syncKeys, callback) {
    getIssues(this.api, {user: user, repo: repo}, function (err, issues) {
        if (err) { return callback(err); }

        async.map(issues, function (issue, next) {
            GitHub.serializeIssue(project, issue, next);
        }, function (err, githubIssue) {
            if (err) { return callback(err); }

            // 安定化のため、projectの情報を取得しなおす
            Project.findById(project._id, function (err, res) {
                if (err) { return callback(err); }
                project = res;

                // find new issues and not match issues
                var newIssues = [];
                var notMatchIssues = [];
                githubIssue.forEach(function (githubIssue) {
                    var kanbanIssue = GitHub.findIssueByNumber(project, githubIssue.github.number);
                    if (!kanbanIssue) {
                        newIssues.push(kanbanIssue);
                    } else {
                        if (syncKeys.some(function (key) { return !_.isEqual(githubIssue[key], kanbanIssue[key]); })) {
                            notMatchIssues.push({kanbanIssue: kanbanIssue, githubIssue: githubIssue});
                        }
                    }
                });

                // update not match issues
                notMatchIssues.forEach(function (issue) {
                    syncKeys.forEach(function (key) {
                        issue.kanbanIssue[key] = issue.githubIssue[key];
                    });
                });

                // TODO: insert new issues

                project.save(function (err, project) {
                    callback(err, project);
                });
            });
        });
    });
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
            labels: repo.labels,
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
                async.map(repo.issues, GitHub.serializeIssue.bind(GitHub, project), function (err, issues) {
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
GitHub.serializeIssue = function (project, issue, callback) {
    var params = {
        title: issue.title,
        body: issue.body,
        assignee: null,
        stage: null,
        github: {
            number: issue.number,
            url: issue.html_url
        },
        labels: [],
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

    // labels
    issue.labels.forEach(function (githubLabel) {
        var label = project.findLabelByName(githubLabel.name);
        // 存在しないラベルを考慮すると面倒なことになるので無視する
        if (label) {
            params.labels.push(label._id);
        }
    });

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
        members: [],
        labels: []
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
        },

        // get labels
        labels: function (next) {
            api.issues.getLabels({
                // labelが101個以上ある場合はpageを巡らないといけないが、そんなに作ることはないと思われるので考慮しない
                user: userName,
                repo: repoName,
                per_page: 100 // max
            }, next);
        }
    }, function (err, results) {
        if (err) { callback(err); return; }

        repo.issues = results.issues;
        repo.members = results.members;
        repo.labels = results.labels;

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