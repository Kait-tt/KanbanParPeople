var should = require('should');
var _ = require('underscore');
var mongoose = require('mongoose');

var GitHub = require('../../../model/github');
var Project = require('../../../model/project');

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
                mongoose.connect('mongodb://localhost/kpp_test_github_importProject', null, done);
            });

            after(function (done) {
                mongoose.disconnect(done);
            });
        });
    });
});