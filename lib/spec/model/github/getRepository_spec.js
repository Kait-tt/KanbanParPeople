var should = require('should');
var rewire = require('rewire');
var _ = require('underscore');

var GitHub = rewire('../../../model/github');

var config = require('config').github.test;

describe('model', function () {
    describe('github', function () {
        describe('#getRepository', function () {
            var github;
            var getRepository;
            var res = {};

            before(function (done) {
                github = new GitHub(config.token);
                getRepository = GitHub.__get__('getRepository').bind(github);
                getRepository(config.user, config.repo, function (err, data) {
                    res.err = err;
                    res.data = data;
                    done();
                });
            });

            it('リクエストは成功しているか', function () {
                should(res.err).be.equal(null);
            });

            it('repositoryプロパティの確認', function () {
                should(res.data.repository).have.properties({
                    userName: config.user,
                    repoName: config.repo,
                    url: 'https://github.com/' + config.user + '/' + config.repo
                });
            });

            it('membersプロパティの確認', function () {
                should(res.data.members).be.an.Array;
                res.data.members.forEach(function (member) {
                    should(member).be.an.String;
                });
            });
        });
    });
});