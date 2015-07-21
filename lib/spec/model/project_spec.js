var should = require('should');
var db = require('../helper/db');
var Project = require('../../model/project');
var User = require('../../model/user');

var config = {
    projectName: 'TestProject',
    userName: 'snakazawa'
};

describe('model', function () {
    describe('project', function () {
        var user;
        var error;

        beforeEach(function (done) {
            db.before(function () {
                // プロジェクト作成用ユーザを作っておく
                User.findOrCreate(config.userName, function (err, doc) {
                    if (err) { throw new Error(err); }
                    user = doc;
                    done();
                });
            });
        });

        after(db.after);

        it('インスタンスを作れる', function () {
            var project = new Project();
            project.should.is.instanceof(Project);
            project.created_at.should.is.instanceof(Date);
        });

        describe('constructor', function () {
            var project;

            beforeEach(function (done) {
                // create project
                Project.create({name: config.projectName, create_user: user}, function (err, doc) {
                    error = err;
                    project = doc;
                    done();
                });
            });

            it('エラーがない', function () { should.not.exists(error); });
            it('プロジェクトを作れる', function () { should.exists(project); });
            it('名前が設定されている', function () { project.name.should.be.equal(config.projectName); });

            describe('exists', function () {
                var isExists;
                describe('is eixsts', function () {
                    before(function (done) {
                        Project.exists({name: config.projectName}, function (err, result) {
                            error = err;
                            isExists = result;
                            done();
                        });
                    });

                    it('エラーがない', function () { should.not.exists(error); });
                    it('存在する', function () { isExists.should.be.true; });
                });

                describe('is not exists', function () {
                    before(function (done) {
                        Project.exists({name: config.projectName + 'asdf'}, function (err, result) {
                            error = err;
                            isExists = result;
                            done();
                        });
                    });

                    it('エラーがない', function () { should.not.exists(error); });
                    it('存在しない', function () { isExists.should.be.false; });
                });
            });

            describe('issue', function () {
                it('初めはIssueを持っていない', function () { project.issues.length.should.be.equal(0); });

                describe('create', function () {
                    beforeEach(function (done) {
                        // create issue
                        project.issues.push({ title: 'taskA' });
                        project.save(function (err, doc) {
                            error = err;
                            project = doc;
                            done();
                        });
                    });

                    it('エラーがない', function () { should.not.exists(error); });
                    it('Issueを追加できる', function () { should.exists(project); });
                    it('Issuesを追加したらIssue数が1つ増える', function () { project.issues.length.should.be.equal(1); });
                });
            });

            describe('member', function () {
                it('初めはメンバーはいない', function () { project.members.length.should.be.equal(0); });

                describe('push', function () {
                    beforeEach(function (done) {
                        // create member
                        project.members.push({ user: user });
                        project.save(function (err, doc) {
                            error = err;
                            project = doc;
                            done();
                        });
                    });

                    it('エラーがない', function () { should.not.exists(error); });
                    it('メンバー数が一人増える', function () { project.members.length.should.be.equal(1); });

                    describe('pull', function () {
                        beforeEach(function (done) {
                            project.members.pull(project.members[0]);
                            project.save(function (err, doc) {
                                error = err;
                                project = doc;
                                done();
                            });
                        });

                        it('エラーがない', function () { should.not.exists(error); });
                        it('メンバーが一人減る', function () { project.members.length.should.be.equal(0); });
                    });

                    describe('removeMember', function () {
                        beforeEach(function (done) {
                            project.removeMember(config.userName, function (err, doc, member) {
                                error = err;
                                project = doc;
                                done();
                            });
                        });

                        it('エラーがない', function () { should.not.exists(error); });
                        it('メンバーが一人減る', function () { project.members.length.should.be.equal(0); });
                    });

                    describe('addMember', function () {
                        beforeEach(function (done) {
                            project.addMember(config.user + 'hoge123', function (err, doc, member) {
                                error = err;
                                project = doc;
                                done();
                            });
                        });

                        it('エラーがない', function () { should.not.exists(error); });
                        it('メンバーが一人増える', function () { project.members.length.should.be.equal(2); });
                    });
                });
            });
        });
        //
        //it('updateStageでIssueを更新できる', function (done) {
        //
        //});
    });
});