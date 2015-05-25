var should = require('should');
var request = require('supertest');
var app = require('../../../app');
var agent =  request.agent(app);
var db = require('../helper/db');
var projectHelper = require('../helper/project');
var socket = require('../../../routes/socket');
var Project = require('../../../lib/model/project');

describe('routes', function () {
    describe('github', function () {
        var project;

        beforeEach(function (done) {
            db.before(function () {
                projectHelper.create(function (newProject) {
                    project = newProject;
                    done();
                });
            });
        });

        afterEach(db.after);

        function request(req) {
            return agent
                .post('/github/' + project.id)
                .set(req.headers)
                .type('json')
                .send(req.body);
        }

        describe('createIssue', function () {
            var req = require('../fixture/github/payload/createIssue');
            var addIssue;

            beforeEach(function () {
                socket.emitters.addIssue = function (projectId, token, params, fn) {
                    if (addIssue) { addIssue.apply(this, arguments); }
                };
            });

            it('should to return success', function (done) {
                request(req).expect(200, done);
            });

            it('should to call socket.addIssue', function (done) {
                var called = false;
                addIssue = function () { called = true; };

                request(req).end(function () {
                    called.should.be.true;
                    done();
                });
            });

            it('should to give projectId, token and params', function (done) {
                addIssue = function (projectId, token, params) {
                    should(projectId).be.eql(project.id);
                    should(token).be.a.null;
                    should(params.title).be.eql(req.body.issue.title);
                    should(params.body).be.eql(req.body.issue.body);
                };
                request(req).end(done);
            });
        });

        describe('removeIssue', function () {
            var req = require('../fixture/github/payload/closeIssue');
            var issueParams = require('../fixture/issue');
            var removeIssue;
            var issue;

            beforeEach(function (done) {
                socket.emitters.removeIssue = function (projectId, token, issueId, fn) {
                    if (removeIssue) { removeIssue.apply(this, arguments); }
                };

                Project.addIssue(project.id, null, issueParams, function (err, project, _issue) {
                    issue = _issue;
                    done();
                });
            });

            it('should to return success', function (done) {
                request(req).expect(200, done);
            });

            it('should to call socket.removeIssue', function (done) {
                var called = false;
                removeIssue = function () { called = true; };

                request(req).end(function () {
                    called.should.be.true;
                    done();
                });
            });

            it('should to give projectId, token and params', function (done) {
                removeIssue = function (projectId, token, issueId) {
                    should(projectId).be.eql(project.id);
                    should(token).be.a.null;
                    should(issueId).be.eql(issue._id);
                };
                request(req).end(done);
            });
        });
    });
});