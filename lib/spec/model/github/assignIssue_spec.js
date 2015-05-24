var should = require('should');
var _ = require('underscore');

var GitHub = require('../../../model/github');

var config = require('config').github.test;

var issueParams = require('../../fixture/issue');
var createIssue = require('../../helper/github/createIssue');

var username = config.user;

describe('model', function () {
    describe('github', function () {
        describe('#assignIssue', function () {
            var github;
            var targetIssue;

            before(function (done) {
                github = new GitHub(config.token);
                createIssue(github, config, issueParams, function (issue) {
                    targetIssue = issue;
                    done();
                });
            });

            it('アサインできる', function (done) {
                github.assignIssue(config.repo, config.user, targetIssue, username, function (err, data) {
                    should(err).be.equal(null);
                    should(data.assignee).be.not.equal(null);
                    should(data.assignee.login).be.equal(username);
                    done();
                });
            });
        });
    });
});