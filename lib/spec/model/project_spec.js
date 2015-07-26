var should = require('should');
var db = require('../helper/db');
var Project = require('../../model/project');
var User = require('../../model/user');
var ew = require('../../module/util/asyncWrap').errorWrap.bind(null, function (err) { throw new Error(err); });
var projectParams = require('../fixture/project');
var userParams = require('../fixture/user');

describe('model', function () {
    describe('project', function () {
        var createUser;
        var project;

        beforeEach(function (done) {
            db.before(function () {
                // プロジェクト作成用ユーザを作っておく
                User.create({userName: userParams.userName}, ew(function (doc) {
                    createUser = doc;
                    done();
                }));
            });
        });

        afterEach(db.after);

        function reFindProject (callback) {
            Project.findOne({name: projectParams.name}, ew(function (doc) {
                project = doc;
                callback();
            }));
        }

        it('インスタンスを作れるか', function () {
            var project = new Project();
            project.should.is.instanceof(Project);
            project.created_at.should.is.instanceof(Date);
        });

        describe('create', function () {
            beforeEach(function (done) {
                projectParams.create_user = createUser;
                Project.create(projectParams, ew(function (doc) {
                    project = doc;
                    done();
                }));
            });

            it('指定した名前のプロジェクトが作られている', function () { project.name.should.be.equal(projectParams.name); });

            describe('exists', function () {
                var isExists;
                var projectName;

                beforeEach(function (done) {
                    Project.exists({name: projectName}, ew(function (res) {
                        isExists = res;
                        done();
                    }));
                });

                describe('exists with 存在するプロジェクト名', function () {
                    before(function () {
                        projectName = projectParams.name;
                    });
                    it('trueが返る', function () { isExists.should.be.equal(true); });
                });

                describe('exists with 存在しないプロジェクト名', function () {
                    before(function () {
                        projectName = projectParams.name + 'hogepiyo';
                    });
                    it('存在しないのでfalseが返る', function () { isExists.should.be.equal(false); });
                });
            });

            describe('addIssue', function () {
                var beforeIssueLength;
                var taskName = 'taskA';
                var issue;

                beforeEach(function (done) {
                    beforeIssueLength = project.issues.length;
                    project.addIssue(null, { title: taskName }, ew(function (_project, _issue) {
                        project = _project;
                        issue = _issue;
                        done();
                    }));
                });

                it('Issueが1つ増えている', function () { should(project.issues.length - beforeIssueLength).be.equal(1); });

                describe('removeIssue', function () {
                    var beforeIssueLength;
                    beforeEach(function (done) {
                        beforeIssueLength = project.issues.length;
                        project.removeIssue(null, issue._id, ew(function () { reFindProject(done); }));
                    });

                    it('Issueが1つ減っている', function () { should(project.issues.length - beforeIssueLength).be.equal(-1); });
                });
            });

            describe('addMember', function () {
                var beforeMemberLength;
                beforeEach(function (done) {
                    beforeMemberLength = project.members.length;
                    project.addMember(userParams.userName, ew(function () { reFindProject(done); }));
                });

                it('メンバーが1人増えている', function () { should(project.members.length - beforeMemberLength).be.equal(1); });

                describe('removeMember', function () {
                    var beforeMemberLength;
                    beforeEach(function (done) {
                        beforeMemberLength = project.members.length;
                        project.removeMember(userParams.userName, ew(function () { reFindProject(done); }));
                    });

                    it('メンバーが1人減っている', function () { should(project.members.length - beforeMemberLength).be.equal(-1); });
                });
            });
        });
    });
});