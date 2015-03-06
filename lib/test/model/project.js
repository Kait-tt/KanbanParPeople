var should = require('should');
var mongoose = require('mongoose');

var Project = require('../../model/project');

describe('model', function () {
    describe('project', function () {
        before(function (done) {
            mongoose.connect('mongodb://localhost/kpp_test_model_project', null, done);
        });

        it('インスタンスを作れるか', function () {
            var project = new Project();
            project.should.is.instanceof(Project);
            project.created_at.should.is.instanceof(Date);
        });

        it('プロジェクトを作ってみる', function (done) {
            Project.create({name: 'TestProject'}, function (err) {
                if (err) { throw new Error(err); }
                done();
            });
        });

        after(function (done) {
            mongoose.connection.db.dropDatabase(function(err) {
                if (err) { throw new Error(err); }
                mongoose.disconnect(done);
            });
        });
    });
});