var should = require('should');
var _ = require('underscore');
var db = require('../../helper/db');

var GitHub = require('../../../model/github');
var Project = require('../../../model/project');

var config = require('config').github.test;

var monky = require('../../factory/setup').monky;
var monkySetUp = require('../../factory/setup').setup;

describe('model', function () {
    describe('github', function () {
        var label;

        before(function (done) {
            db.before(function (err) {
                if (err) { console.error(err && (err.stack || err)); throw new Error(err); }
                monky.build('Label', function (err, _label) {
                    if (err) { console.error(err); throw new Error(err); }
                    _label.name += Math.round(Math.random() * 10000);
                    label = _label;
                    done();
                });
            });
        });

        after(db.after);

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

        describe('#syncLabelsFromGitHub', function () {
            var project;
            var err;
            var newLabels;

            before(function (done) {
                var github = new GitHub(config.token);
                monkySetUp(function (err, _project) {
                    if (err) { console.error(err); throw new Error(err); }
                    Project.findById(_project._id, function (err, _project) {
                        if (err) { console.error(err); throw new Error(err); }
                        github.syncLabelsFromGitHub(config.repo, config.user, _project, function (_err, _project, _newLabels) {
                            err = _err;
                            project = _project;
                            newLabels = _newLabels;
                            done();
                        });
                    });

                });
            });

            it('リクエストは成功しているか', function () { should.not.exists(err); });
            it('いくつかのラベルが存在するか', function () { should(project.labels.length).be.above(3); });
            it('fetchしたラベルとprojectが保持するラベルは同じか', function () {
                should(_.sortBy(_.pluck(project.labels, 'name'))).be.eql(_.sortBy(_.pluck(newLabels, 'name')));
            });
        });

        describe('#syncIssuesFromGitHub with labels', function () {
            var err;
            var project;

            before(function (done) {
                var github = new GitHub(config.token);
                monkySetUp(function (err, _project) {
                    if (err) { console.error(err); throw new Error(err); }
                    Project.findById(_project._id, function (err, _project) {
                        if (err) { console.error(err); throw new Error(err); }
                        github.syncIssuesFromGitHub(config.repo, config.user, _project, ['labels'], function (_err, _project) {
                            err = _err;
                            project = _project;
                            done();
                        });
                    });

                });
            });

            it('リクエストは成功しているか', function () { should.not.exists(err); });
        });
    });
});