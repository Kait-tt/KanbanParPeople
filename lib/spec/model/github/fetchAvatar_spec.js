var should = require('should');
var GitHub = require('../../../model/github');

var config = require('config').github.test;

var username = config.user;

describe('model', function () {
    describe('github', function () {
        describe('#fetchAvatar', function () {
            var github;
            var res;

            before(function (done) {
                github = new GitHub(config.token);
                github.fetchUserAvatar([config.user], function (err, _res) {
                    if (err) { console.error(err && (err.stack || err)); throw new Error(err); }
                    res = _res;
                    done();
                });
            });

            it('got a avatar url', function () { should(res.length).be.eql(1); });
            it('url at first item is start with http', function () { should(res[0].url).startWith('http'); });
            it('path at second item is path', function () {
                should(res[0].path).containEql('public').containEql('images').containEql('avatar').containEql(username + '.');
            });
        });
    });
});