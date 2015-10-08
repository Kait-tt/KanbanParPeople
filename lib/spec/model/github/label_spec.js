var should = require('should');
var _ = require('underscore');

var GitHub = require('../../../model/github');

var config = require('config').github.test;

var monky = require('../../factory/setup').monky;

describe('model', function () {
    describe('github', function () {
        var label;

        before(function (done) {
            monky.build('Label', function (err, _label) {
                if (err) { console.error(err); throw new Error(err); }
                _label.name += Math.round(Math.random() * 10000);
                label = _label;
                done();
            });
        });

        describe('#addLabel', function () {
            var res = {};

            before(function (done) {
                var github = new GitHub(config.token);
                github.addLabel(config.repo, config.user, label, function (err, data) {
                    res.err = err;
                    res.data = data;
                    done();
                });
            });

            it('リクエストは成功しているか', function () {
                should(res.err).be.equal(null);
            });
        });

        describe('#removeLabel', function () {
            var res = {};

            before(function (done) {
                var github = new GitHub(config.token);
                github.removeLabel(config.repo, config.user, label, function (err, data) {
                    res.err = err;
                    res.data = data;
                    done();
                });
            });

            it('リクエストは成功しているか', function () {
                should(res.err).be.equal(null);
            });
        });

        describe('#fetchlabels', function () {
            var res = {};

            before(function (done) {
                var github = new GitHub(config.token);
                github.fetchLabels(config.repo, config.user, function (err, data) {
                    res.err = err;
                    res.data = data;
                    done();
                });
            });

            it('リクエストは成功しているか', function () {
                should(res.err).be.equal(null);
            });
        });


    });
});