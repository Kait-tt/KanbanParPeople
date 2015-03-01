var GitHubApi = require('github');

function GitHub (token) {
    this.api = new GitHubApi({
        version: '3.0.0'
    });
    this.api.authenticate({
        type: 'oauth',
        token: token
    });
}

module.exports = GitHub;