var should = require('should');
var db = require('../helper/db');
var Project = require('../../model/project');
var User = require('../../model/user');
var ew = require('../../module/util/asyncWrap').errorWrap.bind(null, function (err) { throw new Error(err); });
var _ = require('lodash');
var userParams = require('../fixture/user');
var stages = require('../../model/stages');
var monky = require('../factory/setup').monky;
var setup = require('../factory/setup').setup;

describe('model', function () {
    describe('project', function () {
        var adminUser;
        var project;
        var issue;
        var issues;
        var member;

        beforeEach(function (done) {
            db.before(function () {
                setup(ew(function (docs) {
                    adminUser = docs.user;
                    project = docs.project;
                    issue = docs.issueParams;
                    issues = docs.issues;
                    member = docs.userParams;
                    done();
                }));
            });
        });

        afterEach(db.after);

        function reFindProject(callback) {
            Project.findOne({name: project.name}, ew(function (doc) {
                project = doc;
                callback();
            }));
        }

        it('インスタンスを作れる', function () {
            var project = new Project();
            project.should.is.instanceof(Project);
            project.created_at.should.is.instanceof(Date);
        });

        describe('create', function () {
            var projectParams;

            beforeEach(function (done) {
                monky.build('Project', {create_user: adminUser._id}, ew(function (doc) {
                    projectParams = doc;
                    Project.create(projectParams, ew(function (doc) {
                        project = doc;
                        done();
                    }));
                }));
            });

            it('指定した名前のプロジェクトが作られている', function () {
                project.name.should.be.equal(projectParams.name);
            });
        });

        describe('exists', function () {
            var isExists;

            describe('with 存在するプロジェクト名', function () {
                beforeEach(function (done) {
                    Project.exists({name: project.name}, ew(function (res) {
                        isExists = res;
                        done();
                    }));
                });

                it('trueが返る', function () { isExists.should.be.equal(true); });
            });

            describe('with 存在しないプロジェクト名', function () {
                beforeEach(function (done) {
                    Project.exists({name: 'hogeeeeeeeeeeeeeeeeeeee'}, ew(function (res) {
                        isExists = res;
                        done();
                    }));
                });

                it('存在しないのでfalseが返る', function () { isExists.should.be.equal(false); });
            });
        });

        describe('issue', function () {
            var beforeIssueLength;

            beforeEach(function () {
                beforeIssueLength = project.issues.length;
            });

            describe('addIssue', function () {
                beforeEach(function (done) {
                    project.addIssue(null, issue, ew(function () { reFindProject(done); }));
                });

                it('Issueが1つ増えている', function () {
                    should(project.issues.length - beforeIssueLength).be.equal(1);
                });
            });

            describe('removeIssue', function () {
                beforeEach(function (done) {
                    project.removeIssue(null, issues[0]._id, ew(function () { reFindProject(done); }));
                });

                it('Issueが1つ減っている', function () { should(project.issues.length - beforeIssueLength).be.equal(-1); });
            });
        });

        describe('member', function () {
            var beforeMemberLength;

            beforeEach(function () {
                beforeMemberLength = project.members.length;
            });

            describe('addMember', function () {
                beforeEach(function (done) {
                    project.addMember(member.userName, ew(function () {
                        reFindProject(done);
                    }));
                });

                it('メンバーが1人増えている', function () {
                    should(project.members.length - beforeMemberLength).be.equal(1);
                });
            });

            describe('removeMember', function () {
                beforeEach(function (done) {
                    project.removeMember(adminUser.userName, ew(function () { reFindProject(done); }));
                });

                it('メンバーが1人減っている', function () { should(project.members.length - beforeMemberLength).be.equal(-1); });
            });
        });

        describe('update issue', function () {
            function wrap(stage, assign, isValid) {
                var params = {};
                var issue;
                var error;

                describe('with ' + (assign ? 'assign' : 'no assign') + ' and change stage to ' + stage, function () {
                    beforeEach(function (done) {
                        params = {stage: stage, userId: assign ? String(adminUser._id) : null};

                        project.updateStage(null, issues[0]._id, params.stage, params.userId, function (err) {
                            error = err;
                            if (!err) {
                                reFindProject(function () {
                                    issue = project.issues[0];
                                    done();
                                });
                            } else {
                                done();
                            }
                        });
                    });

                    if (isValid) {
                        it('expected not to be error', function () { should.not.exists(error); });
                        it('valid stage', function () { issue.stage.should.be.equal(params.stage); });
                        it('valid assignee', function () { String(issue.assignee).should.be.equal(String(params.userId)); });
                    } else {
                        it('expected to be error', function () { should.exists(error); });
                    }
                });
            }

            wrap(stages.todo, true, true);
            wrap(stages.todo, false, false);
            wrap(stages.done, true, false);
            wrap(stages.done, false, true);
        });
    });
});