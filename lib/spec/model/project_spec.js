var should = require('should');
var db = require('../helper/db');
var Project = require('../../model/project');
var User = require('../../model/user');
var ew = require('../../module/util/asyncWrap').errorWrap.bind(null, function (err) { throw new Error(err); });

var config = {
    projectName: 'TestProject',
    user: 'snakazawa'
};

describe('model', function () {
    describe('project', function () {
        var share = {
            user: null,
            project: null
        };

        before(function (done) {
            db.before(function () {
                // プロジェクト作成用ユーザを作っておく
                User.create({userName: config.user}, ew(function (doc) {
                    share.user = doc;
                    done();
                }));
            });
        });

        after(db.after);

        it('インスタンスを作れるか', function () {
            var project = new Project();
            project.should.is.instanceof(Project);
            project.created_at.should.is.instanceof(Date);
        });

        it('プロジェクトを作ってみる', function (done) {
            var name = config.projectName;
            Project.create({name: name, create_user: share.user}, ew(function (project) {
                share.project = project;
                project.name.should.be.equal(name);
                done();
            }));
        });

        it('Issuesを追加する', function (done) {
            var name = 'TestProjectB';
            var project = share.project;

            project.issues.length.should.be.equal(0);

            project.issues.push({ title: 'taskA' });

            project.save(ew(function (project) {
                project.issues.length.should.be.equal(1);

                Project.findOne({name: config.projectName}, ew(function (project) {
                    project.issues.length.should.be.equal(1);
                    share.project = project;
                    done();
                }));
            }));
        });

        it('Memberを追加する', function (done) {
            var project = share.project;
            project.members.length.should.be.equal(0);

            project.members.push({ user: share.user });
            project.members.push({ user: share.user });
            project.members.push({ user: share.user });

            project.save(ew(function (project) {
                project.members.length.should.be.equal(3);

                Project.findOne({name: config.projectName}, ew(function (project) {
                    project.members.length.should.be.equal(3);
                    done();
                }));
            }));
        });

        it('Memberを削除する', function (done) {
            Project.findOne({name: config.projectName}, ew(function (project) {
                project.members.length.should.be.equal(3);
                project.members.pull(project.members[0]);

                project.save(ew(function (project) {
                    project.members.length.should.be.equal(2);

                    Project.findOne({name: config.projectName}, ew(function (project) {
                        project.members.length.should.be.equal(2);
                        done();
                    }));
                }));
            }));
        });

        it('removeMemberメソッドでMemberを削除する', function (done) {
            Project.findOne({name: config.projectName}, ew(function (project) {
                project.members.length.should.be.equal(2);

                project.removeMember(config.user,  ew(function (project, member) {
                    project.members.length.should.be.equal(1);

                    Project.findOne({name: config.projectName},  ew(function (project) {
                        project.members.length.should.be.equal(1);
                        done();
                    }));
                }));
            }));
        });

        it('removeMemberスタティックメソッドでMemberを削除する', function (done) {
            Project.removeMember({name: config.projectName}, config.user,  ew(function (project, member) {
                project.members.length.should.be.equal(0);

                Project.findOne({name: config.projectName},  ew(function (project) {
                    project.members.length.should.be.equal(0);
                    done();
                }));
            }));
        });

        it('addMemberメソッドでMemberを追加する', function (done) {
            Project.findOne({name: config.projectName},  ew(function (project) {
                project.members.length.should.be.equal(0);

                project.addMember(config.user + 'hoge123',  ew(function (project, member) {
                    project.members.length.should.be.equal(1);

                    Project.findOne({name: config.projectName},  ew(function (project) {
                        project.members.length.should.be.equal(1);
                        done();
                    }));
                }));
            }));
        });

        it('addMemberスタティックメソッドでMemberを追加する', function (done) {
            Project.addMember({name: config.projectName}, config.use + 'piyohoge',  ew(function (project, member) {
                project.members.length.should.be.equal(2);

                Project.findOne({name: config.projectName},  ew(function (project) {
                    project.members.length.should.be.equal(2);
                    done();
                }));
            }));
        });

        it('existsメソッド', function (done) {
            Project.exists({name: config.projectName},  ew(function (isExists) {
                isExists.should.be.equal(true);
                done();
            }));
        });

        it('existsメソッドfalse', function (done) {
            Project.exists({name: config.projectName + 'asdf'},  ew(function (isExists) {
                isExists.should.be.equal(false);
                done();
            }));
        });
    });
});