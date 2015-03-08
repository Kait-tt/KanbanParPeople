var async = require('async');
var _ = require('underscore');
var GitHubApi = require('github');
var Project = require('./project');
var User = require('./user');
var Issue = require('./issue');

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

GitHub.prototype.importProject = function (userName, repoName, callback) {
    getRepository.call(this, userName, repoName, function (err, repo) {
        if (err) { callback(err); return; }

        var project = new Project({
            name: repoName,
            github: repo.repository,
            members: [],
            issues: []
        });

        async.series([
            // create or find members
            function (next) {
                async.map(repo.members, User.findOrCreate.bind(User), function (err, members) {
                    if (err) { next(err); return; }

                    // project#member用に整形
                    project.members = members.map(function (member) {
                        return { userId: member._id };
                    });

                    next(null);
                });
            },

            // create issues
            function (next) {
                async.map(repo.issues, function (data, callback) {
                    var issue = new Issue({
                        title: data.title,
                        body: data.body,
                        stage: 'issue',
                        assignee: null,
                        github: {
                            number: data.number,
                            url: data.url
                        },
                        created_at: data.created_at,
                        updated_at: data.updated_at
                    });

                    // stateの決定
                    if (data.state === 'closed') {
                        issue.stage = 'done';
                    } else if (data.state === 'open') {
                        issue.stage = data.assignee ? 'todo' : 'issue';
                    }

                    // assigneeの割り当て
                    if (data.assignee) {
                        User.findOrCreate(data.assignee, function (err, user) {
                            if (err) { callback(err); return; }
                            issue.assignee = user._id;
                            callback(null, issue);
                        });
                    } else {
                        callback(null, issue);
                    }

                }, function (err, issues) {
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
            api.issues.repoIssues({
                user: userName,
                repo: repoName,
                state: 'all'
            }, function (err, data) {
                if (err) { next(err); return; }

                var issues = data
                    .filter(function (issue) { // pull-requestは無視
                        return issue.pull_request === undefined;
                    }).map(function (issue) {
                        return {
                            title: issue.title,
                            body: issue.body,
                            url: issue.html_url,
                            state: issue.state,
                            created_at: new Date(issue.created_at),
                            updated_at: new Date(issue.updated_at),
                            closed_at: new Date(issue.closed_at),
                            assignee: issue.assignee ? issue.assignee.login : null,
                            number: issue.number
                        };
                    });

                next(null, issues);
            });
        }
    }, function (err, results) {
        if (err) { callback(err); return; }

        repo.issues = results.issues;
        repo.members = results.members;

        callback(null, repo);
    });
}

module.exports = GitHub;