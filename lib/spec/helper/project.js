var Project = require('../../model/project');
var User = require('../../model/user');
var project = require('../fixture/project');
var user = require('../fixture/user');
var should = require('should');

module.exports = {
    create: function (done) {
        User.create(user, function (err, user) {
            should(err).be.equal(null);
            project.create_user = user;
            Project.create(project, function (err, project) {
                done(project, user);
            });
        });
    }
};