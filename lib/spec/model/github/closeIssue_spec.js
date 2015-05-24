var should = require('should');
var _ = require('underscore');

var GitHub = require('../../../model/github');

var config = require('config').github.test;

var issueParams = require('../../fixture/github/issue');
var createIssue = require('../../helper/github/createIssue');

describe('model', function () {
    describe('github', function () {
        describe('#closeIssue', function () {
            var github;
            var targetIssue;

            before(function (done) {
                github = new GitHub(config.token);
                createIssue(github, config, issueParams, function (issue) {
                    targetIssue = issue;
                    done();
                });
            });

            it('削除できる', function (done) {
                github.closeIssue(config.repo, config.user, targetIssue, function (err, data) {
                    should(err).be.equal(null);
                    done();
                });
            });
        });
    });
});