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

            it('issuesプロパティの確認', function () {
                var properties = {
                    // name: type
                    title: String,
                    body: [String],
                    url: String,
                    state: String,
                    created_at: Date,
                    updated_at: Date,
                    closed_at: Date,
                    assignee: [String],
                    number: Number
                };

                should(res.data.issues).be.an.Array;

                // 検証プロパティの有無と型のチェック
                res.data.issues.forEach(function (issue) {
                    _.each(properties, function (type, key) {
                        var value = issue[key];

                        should(issue).have.property(key);

                        if (_.isArray(type)) { // null許可
                            if (value !== null) {
                                should(issue[key]).is.instanceOf(type[0]);
                            }
                        } else {
                            should(issue[key]).is.instanceOf(type);
                        }
                    });
                });
            });
        });
    });
});