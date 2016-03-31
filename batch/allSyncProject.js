var _ = require('underscore');
var config = require('config');
var async = require('async');
var mongoose = require('mongoose');
var GitHub = require('../lib/model/github');
var Project = require('../lib/model/project');

console.log('### sync all project for labels ###');

mongoose.connect(config.get('mongo.url'));

var projects;


async.series([
    function (next) {
        console.log('find all projects...');
        Project.find({}, function (err, docs) {
            projects = docs;
            next(err);
        });
    },

    function (next) {
        console.log('sync ...');
        var syncProjects = projects.filter(function (project) { return project.github.sync; });
        async.each(syncProjects, function (project, nextProject) {
            console.log('[' + project.name + ']');

            var github = new GitHub(project.github.token);
            var needSyncLabels;

            async.series([
                // check necessary of sync labels
                function (nextStep) {
                    github.checkNeedUpdateLabels(project.github.repoName, project.github.userName, project, function (err, res) {
                        needSyncLabels = res;
                        nextStep(err);
                    });
                },

                // sync labels
                function (nextStep) {
                    if (needSyncLabels) {
                        console.log('sync labels...');
                        github.syncLabelsFromGitHub(project.github.repoName, project.github.userName, project, function (err, project) {
                            nextStep(err);
                        });
                    } else {
                        nextStep(null);
                    }
                },

                // sync issues
                function (nextStep) {
                    console.log('sync issues...');
                    github.syncIssuesFromGitHub(project.github.repoName, project.github.userName, project, ['labels', 'title', 'body'], function (err, project) {
                        nextStep(err);
                    });
                }
            ], function (err, res) {
                if (err) { console.error(err); }
                nextProject();
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
