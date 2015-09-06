var should = require('should');
var request = require('supertest');
var app = require('../../../app');
var agent =  request.agent(app);
var db = require('../helper/db');
var socket = require('../../../routes/socket');
var Project = require('../../../lib/model/project');
var _ = require('underscore');
var stages = require('../../../lib/model/stages');
var setup = require('../factory/setup').setup;

describe('routes', function () {
    describe('github', function () {
        var project, owner;

        before(db.before);
        after(db.after);

        beforeEach(function (done) {
            setup(function (err, res) {
                project = res.project;
                owner = project.create_user;
                done();
            });
        });

        function request(req) {
            return agent
                .post('/github/' + project.id)
                .set(req.headers)
                .type('json')
                .send(req.body);
        }

        // objのmethodが呼ばれることを期待する
        function shouldToCall(req, obj, method, done) {
            var called = false;
            obj[method] = function () { called = true; };

            request(req).end(function () {
                called.should.be.true;
                done();
            });
        }

        describe('createIssue', function () {
            var method = 'addIssue';
            var req = require('../fixture/github/payload/createIssue');

            beforeEach(function () {
                socket.emitters[method] = _.noop;
            });

            it('should to return success', function (done) {
                request(req).expect(200, done);
            });

            it('should to call socket.addIssue', function (done) {
                shouldToCall(req, socket.emitters, method, done);
            });

            it('should to give projectId, token and params', function (done) {
                socket.emitters[method] = function (projectId, token, params) {
                    should(projectId).be.eql(project.id);
                    should(token).be.a.null;
                    should(params.title).be.eql(req.body.issue.title);
                    should(params.body).be.eql(req.body.issue.body);
                };
                request(req).end(done);
            });
        });

        describe('removeIssue', function () {
            var method = 'removeIssue';
            var req = require('../fixture/github/payload/closeIssue');
            var issueParams = require('../fixture/issue');
            var issue;

            beforeEach(function () {
                socket.emitters[method] = _.noop;
                issue = project.issues[0];
                req.body.issue.number = issue.github.number;
            });

            it('should to return success', function (done) {
                request(req).expect(200, done);
            });

            it('should to call socket.removeIssue', function (done) {
                shouldToCall(req, socket.emitters, method, done);
            });

            it('should to give projectId, token and issueId', function (done) {
                socket.emitters[method] = function (projectId, token, issueId) {
                    should(projectId).be.eql(project.id);
                    should(token).be.a.null;
                    should(issueId).be.eql(issue._id);
                };
                request(req).end(done);
            });
        });

        describe('assignIssue', function () {
            var method = 'updateStage';
            var req = require('../fixture/github/payload/assignedIssue');
            var issue;

            beforeEach(function () {
                socket.emitters[method] = _.noop;
                issue = project.issues[0];
                req.body.issue.assignee.login = project.members[0].user.userName;
                req.body.issue.number = issue.github.number;
            });

            it('should to return success', function (done) {
                request(req).expect(200, done);
            });

            it('should to call socket.assignIssue', function (done) {
                shouldToCall(req, socket.emitters, method, done);
            });

            it('should to give projectId, token, issueId, toStage, userId', function (done) {
                socket.emitters[method] = function (projectId, token, issueId, toStage, userId) {
                    should(projectId).be.eql(project.id);
                    should(token).be.a.null;
                    should(issueId).be.eql(issue._id);
                    should(toStage).be.equal(stages.todo);
                    should(userId).be.eql(owner._id);
                };
                request(req).end(done);
            });
        });
    });
});