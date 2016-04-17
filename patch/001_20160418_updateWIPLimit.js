var _ = require('underscore');
var config = require('config');
var async = require('async');
var mongoose = require('mongoose');
var GitHub = require('../lib/model/github');
var Project = require('../lib/model/project');

console.log('### multiply each WIPLimit by three ###');

mongoose.connect(config.get('mongo.url'));

Project.find({}, function (err, projects) {
    if (err) {
        console.error('cannot find projects');
        console.error(err);
        mongoose.disconnect();
        return;
    }

    async.each(projects, function (project, next) {
        console.log('update project: ' + project.name);
        project.members.forEach(function (member) {
            member.wipLimit *= 3;
        });
        project.save(function (err) {
            if (err) {
                console.error('error: cannot update project ' + project.name);
                console.error(err);
            }
            next(err);
        });
    }, function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log('all completed');
        }
        mongoose.disconnect();
    });
});
