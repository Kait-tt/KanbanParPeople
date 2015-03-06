var should = require('should');
var mongoose = require('mongoose');

var Project = require('../../model/project');

describe('model', function () {
    describe('project', function () {
        before(function (done) {
            mongoose.connect('mongodb://localhost/kpp_test_model_project', null, done);
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
            var name = 'TestProjectA';
            Project.create({name: name}, function (err, project) {
                if (err) { throw new Error(err); }
                project.name.should.be.equal(name);
                done();
            });
        });

        it('Issuesを追加する', function (done) {
            var name = 'TestProjectB';
            var project = new Project({name: name});
            project.issues.push({
                title: 'taskA'
            });
            project.save(function (err, project) {
                if (err) { throw new Error(err); }
                project.name.should.be.equal(name);
                done();
            });
        });
    });
});