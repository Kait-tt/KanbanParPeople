var assert = require('assert');
var should = require('should');

var User = require('../../model/user');

describe('model', function () {
    describe('user', function () {
        it('インスタンスを作れるか', function () {
            var user = new User();
            user.should.is.instanceof(User);
            user.created_at.should.is.instanceof(Date);
        });
    });
});