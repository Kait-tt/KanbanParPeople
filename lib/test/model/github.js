var should = require('should');

var GitHub = require('../../model/github');

var config = {
    user: 'snakazawa',
    repo: 'test'
};

describe('model', function () {
    describe('github', function () {
        var github;

        before(function (done) {
            github = new GitHub();
            done();
        });

        it('インスタンスを作れるか', function () {
            github.should.is.instanceof(GitHub);
        });

        it('repoに接続できるか', function (done) {
            github.api.repos.get(config, function (err, data) {
                should(err).be.equal(null);
                done();
            });
        });
    });
});