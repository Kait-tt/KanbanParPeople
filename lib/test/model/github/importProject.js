var should = require('should');
var _ = require('underscore');
var mongoose = require('mongoose');

var GitHub = require('../../../model/github');
var Project = require('../../../model/project');

var config = {
    user: 'snakazawa',
    repo: 'test',
    token: process.env.KPP_GITHUB_TEST_TOKEN
};

describe('model', function () {
    describe('github', function () {
        describe('#importProject', function () {
            var github;

            before(function (done) {
                github = new GitHub(config.token);
                mongoose.connect('mongodb://localhost/kpp_test_github_importProject', null, done);
            });

            after(function (done) {
                //mongoose.connection.db.dropDatabase(function(err) {
                //    if (err) { throw new Error(err); }
                    mongoose.disconnect(done);
                //});
            });

            it('snakazawa/testをimport', function(done) {
                github.importProject('snakazawa', 'test', function (err, data) {
                    if (err) { throw new Error(err); }

                    // コードで確認するのは非常に面倒なので、とりあえず実行できたらOK
                    done();
                });
            });
        });
    });
});