var should = require('should');
var _ = require('underscore');

var GitHub = require('../../../model/github');

var config = require('config').github.test;

var issueParams = require('../../fixture/github/issue');
var updatedDetailParams = require('../../fixture/github/updatedDetailIssue');
var createIssue = require('../../helper/github/createIssue');

describe('model', function () {
    describe('github', function () {
        describe('#updateDetailIssue', function () {
            var github;
            var targetIssue;

            before(function (done) {
                github = new GitHub(config.token);
                createIssue(github, config, issueParams, function (issue) {
                    targetIssue = issue;
                    done();
                });
            });

            it('titleとbodyが修正できる', function (done) {
                github.updateDetail(config.repo, config.user, targetIssue, updatedDetailParams, function (err, data) {
                    should(err).be.equal(null);
                    should(data.title).be.equal(updatedDetailParams.title);
                    should(data.body).be.equal(updatedDetailParams.body);
                    done();
                });
            });
        });
    });
});