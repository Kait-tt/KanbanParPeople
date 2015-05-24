var should = require('should');
var mongoose = require('mongoose');

var User = require('../../model/user');

describe('model', function () {
    describe('user', function () {
        it('インスタンスを作れるか', function () {
            var user = new User();
            user.should.is.instanceof(User);
            user.created_at.should.is.instanceof(Date);
        });

        describe('#findOrCreate', function () {
            before(function (done) {
                mongoose.connect('mongodb://localhost/kpp_test_model_user', null, done);
            });

            after(function (done) {
                mongoose.connection.db.dropDatabase(function(err) {
                    if (err) { throw new Error(err); }
                    mongoose.disconnect(done);
                });
            });

            // test用のwrap
            function findOrCreateWrap(userName, expectCount, done) {
                User.findOrCreate(userName, function (err, user) {
                    if (err) { throw new Error(err); }
                    user.userName.should.be.equal(userName);

                    User.count({}, function (err, count) {
                        if (err) { throw new Error(err); }
                        count.should.be.equal(expectCount);

                        done();
                    });
                });
            }

            it('存在しないからユーザが作られる', function (done) {
                findOrCreateWrap('hoge', 1, done);
            });

            it('存在しないからユーザが作られる(2)', function (done) {
                findOrCreateWrap('piyo', 2, done);
            });

            it('存在してるからユーザは作られない', function (done) {
                findOrCreateWrap('hoge', 2, done);
            });
        });
    });
});