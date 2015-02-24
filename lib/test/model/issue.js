var should = require('should');

var Issue = require('../../model/issue');

describe('model', function () {
    describe('project', function () {
        it('インスタンスを作れるか', function () {
            var user = new Issue();
            user.should.is.instanceof(Issue);
            user.created_at.should.is.instanceof(Date);
        });
    });
});