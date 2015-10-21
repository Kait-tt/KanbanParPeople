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
        Project.find({}, function (err, projects) {
            next(null, (projects || []).map(function (project) { return _.pick(project, 'id', 'name'); }));
        });
    },

    // each stat
    function (projects, next) {
        async.map(projects, function (project, nextProject) {
            var qry = {
                'values.projectId': project.id,
                'values.type': 'socket',
                'values.action': 'on',
                'values.username': {'$ne': ''}
            };
            Log.find(qry, function (err, logs) {
                project.logs = logs;
                nextProject(err, project);
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
    },

    // format to tsv
    function (projects, next) {
        var keys = _.chain(projects)
            .map(function (project) { return _.keys(project.keys); })
            .flatten()
            .unique()
            .value();

        var values = projects.map(function (project) {
            return [project.name].concat(keys.map(function (key) {
                return project.keys[key] || 0;
            }));
        });

        var header = ['projectName'].concat(keys);

        var ary = [header].concat(values);

        var tsv = _.invoke(ary, 'join', '\t').join('\n');

        next(null, tsv);
    }

], function (err, projects) {
    if (err) {
        console.error(err);
    } else {
        console.log(projects);
    }
    mongoose.disconnect();
});
