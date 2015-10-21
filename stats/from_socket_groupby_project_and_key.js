var _ = require('lodash');
var config = require('config');
var async = require('async');
var mongoose = require('mongoose');
var Log = require('../lib/model/log');
var Project = require('../lib/model/project');

console.log('### SELECT project_name, key, count from logs WHERE action = on and type = socket  GROUP BY project_name, key');

mongoose.connect(config.get('mongo.url'));

async.waterfall([
    // get projects
    function (next) {
        Project.find({}, next);
    },

    // each stat
    function (projects, next) {
        async.map(projects, function (project, nextProject) {
            var qry = {
                'values.projectId': project.id,
                'values.type': 'socket',
                'values.action': 'on',
                'values.username': {'$ne': 'snakazawa'}
            };
            Log.find(qry, function (err, logs) {
                nextProject(err, {project: _.pick(project, 'id', 'name'), logs: logs});
            });
        }, function (err, results) {
            next(err, results);
        });
    },

    // group by key and count
    function (projects, next) {
        projects.forEach(function (project) {
            project.keys = _.countBy(project.logs, function (log) { return log.values.key; });
            delete project.logs;
        });

        next(null, projects);
    }

], function (err, projects) {
    if (err) {
        console.error(err);
    } else {
        console.log(projects);
        console.log('done');
    }
    mongoose.disconnect();
});
