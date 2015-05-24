var should = require('should');
var db = require('../helper/db');
var User = require('../../model/user');

describe('model', function () {
    describe('user', function () {
        it('インスタンスを作れるか', function () {
            var user = new User();
            user.should.is.instanceof(User);
            user.created_at.should.is.instanceof(Date);
        });

        describe('#findOrCreate', function () {
            before(db.before);

            after(db.after);

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