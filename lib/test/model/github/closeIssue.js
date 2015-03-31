var should = require('should');
var _ = require('underscore');

var GitHub = require('../../../model/github');

var config = require('config').github.test;

describe('model', function () {
    describe('github', function () {
        describe('#closeIssue', function () {
            var github;
            var res = {};

            var closeIssueParams = {
                title: 'test title',
                body: 'test body'
            };

            before(function (done) {
                github = new GitHub(config.token);
                github.createIssue(config.repo, config.user, closeIssueParams, function (err, data) {
                    res.err = err;
                    res.data = data;
                    done();
                });
            });

            after(function (done) {
                done();
            });


            it('createリクエストは成功しているか', function () {
                should(res.err).be.equal(null);
            });

            it('削除できるか', function (done) {
                github.closeIssue(config.repo, config.user, res.data, function (err, data) {
                    console.log(data);
                    should(res.err).be.equal(null);
                    done();
                });
            });
        });
    });
});