var should = require('should');

var Project = require('../../model/project');

describe('model', function () {
    describe('project', function () {
        it('インスタンスを作れるか', function () {
            var user = new Project();
            user.should.is.instanceof(Project);
            user.created_at.should.is.instanceof(Date);
        });
    });
});