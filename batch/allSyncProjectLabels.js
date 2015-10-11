var _ = require('underscore');
var config = require('config');
var async = require('async');
var mongoose = require('mongoose');
var GitHub = require('../lib/model/github');
var Project = require('../lib/model/project');

console.log('### sync all project for labels ###');

mongoose.connect(config.get('mongo.url'));

var projects;
var github = new GitHub();


async.series([
    function (next) {
        console.log('find all projects...');
        Project.find({}, function (err, docs) {
            if (err) { next(err); }
            else {
                projects = docs;
                next();
            }
        });
    },

    function (next) {
        console.log('sync labels...');
        var syncProjects = projects.filter(function (project) { return project.github.sync; });
        async.each(syncProjects, function (project, nextProject) {
            console.log('[' + project.name + ']');

            // å†å¿Ç‚api limitìôÇ≈ÉGÉâÅ[Ç…Ç»ÇÈÇ±Ç∆Ç™Ç†ÇÈÇÃÇ≈ñ≥éãÇµÇƒéüÇÃprojectÇÃèàóùÇ…à⁄ÇÈ
            console.log('syncLabelsFromGitHub...');
            github.syncLabelsFromGitHub(project.github.repoName, project.github.userName, project, function (err, project) {
                if (err) { console.error(err); nextProject(); }
                console.log('syncIssuesFromGitHub...');
                github.syncIssuesFromGitHub(project.github.repoName, project.github.userName, project, ['labels'], function (err, project) {
                    if (err) { console.error(err); nextProject(); }
                    nextProject();
                });
            });
        }, next);
    }

], function (err) {
    if (err) {
        console.error(err);
    } else {
        console.log('done');
    }
    mongoose.disconnect();
});
