var GitHubApi = require('github');

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
};

// repoのissuesを取得して、システム用に整形して返す
function getRepository (userName, repoName, callback) {
    this.api.issues.repoIssues({
        user: userName,
        repo: repoName,
        state: 'all'
    }, function (err, data) {
        if (err) { callback(err, data); return; }

        var res = {
            repository: {
                userName: userName,
                repoName: repoName,
                url: 'https://github.com/' + userName + '/' + repoName
            },
            issues: []
        };

        res.issues = data
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

        callback(null, res);
    });
}

module.exports = GitHub;