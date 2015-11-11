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

            var github = new GitHub(project.github.token);
            console.log(project.github.token);
            return nextProject();

            github.checkNeedUpdateLabels(project.github.repoName, project.github.userName, project, function (err, res) {
                if (err) {
                    console.error(res.message);
                    nextProject();
                    return;
                }
                if (!res) {
                    console.log('it is not necessary to sync labels');
                    nextProject();
                    return;
                }

                // 権限やapi limit等でエラーになることがあるので無視して次のprojectの処理に移る
                console.log('syncLabelsFromGitHub...');
                github.syncLabelsFromGitHub(project.github.repoName, project.github.userName, project, function (err, project) {
                    if (err) {
                        console.error(err);
                        nextProject();
                        return;
                    }
                    console.log('syncIssuesFromGitHub...');
                    github.syncIssuesFromGitHub(project.github.repoName, project.github.userName, project, ['labels'], function (err, project) {
                        if (err) {
                            console.error(err);
                            nextProject();
                            return;
                        }
                        nextProject();
                    });
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
