var should = require('should');
var mongoose = require('mongoose');

var Project = require('../../model/project');
var User = require('../../model/user');


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
            mongoose.connect('mongodb://localhost/kpp_test_model_project', null, function () {
                // プロジェクト作成用ユーザを作っておく
                User.create({userName: config.user}, function (err, doc) {
                    if (err) { throw new Error(err); }
                    share.user = doc;
                    done();
                })
            });

        });

        after(function (done) {
            mongoose.connection.db.dropDatabase(function(err) {
                if (err) { throw new Error(err); }
                mongoose.disconnect(done);
            });
        });

        it('インスタンスを作れるか', function () {
            var project = new Project();
            project.should.is.instanceof(Project);
            project.created_at.should.is.instanceof(Date);
        });

        it('プロジェクトを作ってみる', function (done) {
            var name = config.projectName;
            Project.create({name: name, create_user: share.user}, function (err, project) {
                if (err) { throw new Error(err); }
                share.project = project;
                project.name.should.be.equal(name);
                done();
            });
        });

        it('Issuesを追加する', function (done) {
            var name = 'TestProjectB';
            var project = share.project;

            project.issues.length.should.be.equal(0);

            project.issues.push({
                title: 'taskA'
            });

            project.save(function (err, project) {
                if (err) { throw new Error(err); }
                project.issues.length.should.be.equal(1);

                Project.findOne({name: config.projectName}, function (err, project) {
                    if (err) { throw new Error(err); }
                    project.issues.length.should.be.equal(1);
                    share.project = project;
                    done();
                });
            });
        });

        it('Memberを追加する', function (done) {
            var project = share.project;
            project.members.length.should.be.equal(0);

            project.members.push({
                user: share.user
            });
            project.members.push({
                user: share.user
            });
            project.members.push({
                user: share.user
            });

            project.save(function (err, project) {
                if (err) { throw new Error(err); }
                project.members.length.should.be.equal(3);

                Project.findOne({name: config.projectName}, function (err, project) {
                    if (err) { throw new Error(err); }
                    project.members.length.should.be.equal(3);
                    done();
                });
            });
        });

        it('Memberを削除する', function (done) {
            Project.findOne({name: config.projectName}, function (err, project) {
                if (err) { throw new Error(err); }

                project.members.length.should.be.equal(3);
                project.members.pull(project.members[0]);

                project.save(function (err, project) {
                    if (err) { throw new Error(err); }
                    project.members.length.should.be.equal(2);

                    Project.findOne({name: config.projectName}, function (err, project) {
                        if (err) { throw new Error(err); }
                        project.members.length.should.be.equal(2);
                        done();
                    });
                });
            });
        });

        it('removeMemberメソッドでMemberを削除する', function (done) {
            Project.findOne({name: config.projectName}, function (err, project) {
                if (err) { throw new Error(err); }

                project.members.length.should.be.equal(2);

                project.removeMember(config.user, function (err, project, member) {
                    if (err) { throw new Error(err); }
                    project.members.length.should.be.equal(1);

                    Project.findOne({name: config.projectName}, function (err, project) {
                        if (err) { throw new Error(err); }
                        project.members.length.should.be.equal(1);
                        done();
                    });
                });
            });
        });

        it('removeMemberスタティックメソッドでMemberを削除する', function (done) {
            Project.removeMember({name: config.projectName}, config.user, function (err, project, member) {
                if (err) { throw new Error(err); }
                project.members.length.should.be.equal(0);

                Project.findOne({name: config.projectName}, function (err, project) {
                    if (err) { throw new Error(err); }
                    project.members.length.should.be.equal(0);
                    done();
                });
            });
        });

        it('addMemberメソッドでMemberを追加する', function (done) {
            Project.findOne({name: config.projectName}, function (err, project) {
                if (err) { throw new Error(err); }

                project.members.length.should.be.equal(0);

                project.addMember(config.user + 'hoge123', function (err, project, member) {
                    if (err) { throw new Error(err); }
                    project.members.length.should.be.equal(1);

                    Project.findOne({name: config.projectName}, function (err, project) {
                        if (err) { throw new Error(err); }
                        project.members.length.should.be.equal(1);
                        done();
                    });
                });
            });
        });

        it('addMemberスタティックメソッドでMemberを追加する', function (done) {
            Project.addMember({name: config.projectName}, config.use + 'piyohoge', function (err, project, member) {
                if (err) { throw new Error(err); }
                project.members.length.should.be.equal(2);

                Project.findOne({name: config.projectName}, function (err, project) {
                    if (err) { throw new Error(err); }
                    project.members.length.should.be.equal(2);
                    done();
                });
            });
        });

        it('existsメソッド', function (done) {
            Project.exists({name: config.projectName}, function (err, isExists) {
                if (err) { throw new Error(err); }

                isExists.should.be.equal(true);
                done();
            });
        });

        it('existsメソッドfalse', function (done) {
            Project.exists({name: config.projectName + 'asdf'}, function (err, isExists) {
                if (err) { throw new Error(err); }

                isExists.should.be.equal(false);
                done();
            });
        });
    });
});