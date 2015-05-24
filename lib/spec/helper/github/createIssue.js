var should = require('should');

module.exports = function (github, config, issueParams, callback) {
    github.createIssue(config.repo, config.user, issueParams, function (err, data) {
        should(err).be.equal(null);
        callback(data);
    });
};