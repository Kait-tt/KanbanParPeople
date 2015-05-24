var request = require('supertest');
var app = require('../../../../app');
var agent =  request.agent(app);
var db = require('../../helper/db');
var projectHelper = require('../../helper/project');

describe('routes', function () {
    describe('api', function () {
        describe('issue', function () {
            var project;

            before(function (done) {
                db.before(function () {
                    projectHelper.create(function (newProject) {
                        project = newProject;
                        done();
                    });
                });
            });

            it('#POST /projects/:projectId/issues', function (done) {
                agent
                    .get('/')
                    .expect(200)
                    .end(done);
            });
        });
    });
});