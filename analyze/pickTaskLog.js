var mongoose = require('mongoose');
var config = require('config');
var async = require('async');
var _ = require('lodash');
var fs = require('fs');
require('date-utils');

var Project = require('../lib/model/project');
var Logs = require('../lib/model/log');

var STORE_PATH = __dirname + '/store/taskUpdateLog';

async.series([
    before, main, after
], function (err, ress) {
    var res = ress[1];
    if (err) {
        console.error(err);
        console.error('error');
    } else {
        console.log(res);
        console.log('completed');
    }
});

function before(done) {
    mongoose.connect(config.get('mongo.url'), done);
}

function after(done) {
    mongoose.disconnect(done);
}

function main(done) {
    var projects;

    async.waterfall([
        // fetch projects
        function (next) {
            Project.find({}, function (err, docs) {
                projects = docs;
                next(err);
            });
        },
        // fetch logs and filter
        function (next) {
            Logs.find({}, function (err, logs) {
                if (err) { return next(err); }
                logs = _.compact(logs);

                var filterPred  =_.matches({type: 'socket', action: 'emit', key: 'update-stage'});
                var res = _.filter(logs, _.flow(_.partial(_.get, _, 'values'), filterPred));

                next(null, res);
            });
        },
        // pick needed params
        function (logs, next) {
            var res = _.map(logs, function (x) {
                return {
                    created_at: x.created_at,
                    issueId: x.values.req.issueId,
                    stage: x.values.req.toStage,
                    assignee: x.values.req.assignee,
                    title: x.values.req.issue.title,
                    body: x.values.req.issue.body
                };
            });

            next(null, res);
        },
        // matching to project and formatting
        function (logs, next) {
            var res = projects.map(function (project) {
                var issueLogs = _.chain(project.issues)
                    .map(function (x) { return _.extend(x, {logs: _.where(logs, {issueId: String(x._id)})}); })
                    .filter(function (x) { return x.logs.length; })
                    .map(function (x) {
                        return {
                            _id: x._id,
                            title: x.logs[0].title,
                            body: x.logs[0].body,
                            created_at: x.created_at,
                            logs: _.map(x.logs, _.partial(_.pick, _, ['stage', 'assignee', 'created_at']))
                        };
                    })
                    .value();

                var projectPicked = _.pick(project, ['id', 'name', 'create_user', 'github', 'created_at']);

                return {project: projectPicked, issueLogs: issueLogs};
            });

            next(null, res);
        },
        // dump
        function (logs, next) {
            var fileFormat = _.template('{projectName}_{projectId}_{datetime}.json',
                {interpolate: /{([\s\S]+?)}/g});

            logs.forEach(function (log) {
                var path = STORE_PATH + '/' + fileFormat({
                    projectName: log.project.name,
                    projectId: log.project.id,
                    datetime: (new Date()).toFormat('YYMMDD_HH24MISS')
                });

                fs.writeFileSync(path, JSON.stringify(log, null, '    '));
                console.log('created: ' + path);
            });
            next(null);
        }
    ], function (err, res) {
        done(err, res);
    });
}
