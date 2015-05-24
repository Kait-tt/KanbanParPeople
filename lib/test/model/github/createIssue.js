var should = require('should');
var _ = require('underscore');

var GitHub = require('../../../model/github');

var config = require('config').github.test;

describe('model', function () {
    describe('github', function () {
        describe('#createIssue', function () {
            var github;
            var res = {};

            var createIssueParams = {
                title: 'test title',
                body: 'test body'
            };

            before(function (done) {
                github = new GitHub(config.token);
                github.createIssue(config.repo, config.user, createIssueParams, function (err, data) {
                    res.err = err;
                    res.data = data;
                    done();
                });
            });

            it('リクエストは成功しているか', function () {
                should(res.err).be.equal(null);
            });

            it('stageは正しいか', function () {
                should(res.data.stage).be.equal('issue');
            });
        });
    });
});