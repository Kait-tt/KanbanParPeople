var should = require('should');
var _ = require('underscore');

var GitHub = require('../../../model/github');

var config = {
    user: 'snakazawa',
    repo: 'test'
};

describe('model', function () {
    describe('github', function () {
        describe('#importProject', function () {
            var github;

            before(function (done) {
                github = new GitHub();
            });
        });
    });
});