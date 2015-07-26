var should = require('should');
var db = require('../helper/db');
var Project = require('../../model/project');
var User = require('../../model/user');
var ew = require('../../module/util/asyncWrap').errorWrap.bind(null, function (err) { throw new Error(err); });
var projectParams = require('../fixture/project');
var userParams = require('../fixture/user');
var GitHubHook = require('../../model/hook/github');

describe('model', function () {
    describe('project with github', function () {
        var createUser;
        var project;
        var token = 'hogehoge';

        beforeEach(function (done) {
            db.before(function () {
                User.create({userName: userParams.userName}, ew(function (doc) {
                    createUser = doc;
                    done();
                }));
            });
        });

        afterEach(db.after);

        describe('create', function () {
            beforeEach(function (done) {
                projectParams.create_user = createUser;
                Project.create(projectParams, ew(function (doc) {
                    project = doc;
                    done();
                }));
            });

            it('指定した名前のプロジェクトが作られている', function () { project.name.should.be.equal(projectParams.name); });
            it('github syncが有効になっている', function () { project.github.sync.should.be.equal(true); });

            describe('addIssue', function () {
                var taskParams = { title: 'hoge' };
                var called;
                var reqs;

                beforeEach(function (done) {
                    called = false;

                    // spy
                    GitHubHook.prototype.addIssue = function (_project, _params, callback) {
                        called = true;
                        reqs = arguments;
                        callback();
                    };

                    project.addIssue(token, taskParams, ew(function () {
                        done();
                    }));
                });

                it('add issue hookが呼び出されている', function () { should(called).be.equal(true); });
                it('第1引数にprojectが渡されている', function () { should(reqs[0]).be.equal(project); });
                it('第2引数にparamsが渡されている', function () { should(reqs[1]).be.equal(taskParams); });

                //describe('removeIssue', function () {
                //    var beforeIssueLength;
                //    beforeEach(function (done) {
                //        beforeIssueLength = project.issues.length;
                //        project.removeIssue(null, issue._id, ew(function () { reFindProject(done); }));
                //    });
                //
                //    it('Issueが1つ減っている', function () { should(project.issues.length - beforeIssueLength).be.equal(-1); });
                //});
            });
        });
    });
});