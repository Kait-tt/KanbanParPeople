var should = require('should');
var rewire = require('rewire');
var _ = require('underscore');

var GitHub = rewire('../../../model/github');

var config = {
    user: 'snakazawa',
    repo: 'test',
    token: process.env.KPP_GITHUB_TEST_TOKEN
};

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
                    body: String,
                    url: String,
                    state: String,
                    created_at: Date,
                    updated_at: Date,
                    closed_at: Date,
                    assignee: [String],
                    number: Number
                };

                should(res.data.issues).be.an.Array;

                res.data.issues.forEach(function (issue) {
                    var keys = _.keys(properties);
                    should(issue).have.properties(keys);

                    keys.forEach(function (key) {
                        var type = properties[key];
                        var value = issue[key];

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