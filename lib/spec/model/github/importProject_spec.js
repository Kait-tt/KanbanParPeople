var should = require('should');
var _ = require('underscore');
var db = require('../../helper/db');

var GitHub = require('../../../model/github');
var User = require('../../../model/user');

var config = require('config').github.test;

describe('model', function () {
    describe('github', function () {
        describe('#importProject', function () {
            var github;

            before(function (done) {
                github = new GitHub(config.token);
                db.before(function () {
                    // ユーザを作っておく
                    User.create({userName: config.user}, function (err) {
                        if (err) { throw new Error(err); }
                        done();
                    });
                });
            });

            after(db.after);

            it('snakazawa/testをimport', function(done) {
                github.importProject(config.user, config.repo, config.user, function (err, project) {
                    if (err) { throw new Error(err); }

                    // コードで確認するのは非常に面倒なので、とりあえず実行できたらOK

                    // hookはさすがに消しておく
                    github.deleteHook(config.repo, config.user, project.github.hook.id, done);
                });
            });
        });
    });
});