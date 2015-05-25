var request = require('supertest');
var app = require('../../../app');
var agent =  request.agent(app);
var db = require('../helper/db');
var projectHelper = require('../helper/project');
var socket = require('../../../routes/socket');

describe('routes', function () {
    describe('github', function () {
        var project;

        before(function (done) {
            db.before(function () {
                projectHelper.create(function (newProject) {
                    project = newProject;
                    done();
                });
            });
        });

        after(db.after);

        function request(req) {
            return agent
                .post('/github')
                .set(req.headers)
                .type('json')
                .send(req.body);
        }

        describe('createIssue', function () {
            var req = require('../fixture/github/payload/createIssue');
            var addIssue;

            beforeEach(function () {
                socket.emitters.addIssue = function (projectId, token, title, body, fn) {
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

            
        });
    });
});