var mongoose = require('mongoose');
var config = require('config');
var async = require('async');
var _ = require('lodash');
var fs = require('fs');
require('date-utils');

var Project = require('../lib/model/project');
var Logs = require('../lib/model/log');

var STORE_PATH = __dirname + '/store/cfd';

var stages = ['issue', 'backlog', 'todo', 'doing', 'review', 'done', 'archive'];

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
            Project.findPopulated({}, {}, function (err, docs) {
                projects = docs;
                next(err);
            });
        },
        // fetch logs and filter
        function (next) {
            Logs.find({}, function (err, logs) {
                if (err) { return next(err); }
                var res = _.filter(logs, _.flow(_.partial(_.get, _, 'values'), function (log) {
                    return  log.type === 'socket' &&
                            log.action === 'emit' &&
                             _.includes(['update-stage', 'add-issue', 'remove-issue'], log.key);
                }));

                next(null, res);
            });
        },
        // pick needed params
        function (logs, next) {
            var res = _.map(logs, function (x) {
                var r = x.values.req;
                return {
                    created_at: x.created_at,
                    issueId: String(r.issueId || r.issue._id),
                    stage: r.toStage || r.issue.stage
                };
            });

            next(null, res);
        },
        // matching to project and formatting
        function (logs, next) {
            var res = projects.filter(function(x){ return _.includes(['KanbanParPeople', 'peppermill-test'], x.name); }).map(function (project) {
                var issueLogs = _.chain(project.issues)
                    .filter(function (x) { return x.workHistory.length; })
                    .map(function (x) { return _.extend(x, {logs: _.where(logs, {issueId: String(x._id)})}); })
                    .filter(function (x) { return x.logs.length; })
                    .map(function (x) {
                        x.logs = _.sortBy(x.logs, 'created_at');
                        return {
                            _id: x._id,
                            created_at: x.created_at,
                            logs: _.map(x.logs, function (log) {
                                return {stage: log.stage, created_at: new Date((new Date(log.created_at)).toYMD())};
                            })
                        };
                    })
                    .value();

                var projectPicked = _.pick(project, ['id', 'name', 'created_at']);

                return {project: projectPicked, issueLogs: issueLogs};
            });

            next(null, res);
        },
        // create CFD
        function (projects, next) {
            var res = [];
            projects.forEach(function (project) {
                var table = {};

                var begin = _.chain(project.issueLogs)
                    .map(function (x) { return _.chain(x.logs).map(function (y) { return y.created_at; }).min().value(); })
                    .min()
                    .value();
                var end   = new Date((new Date()).add({days: 1}).toYMD());

                if (!isFinite(begin)) return; // logs is empty

                for (var ymd = new Date(begin); ymd < end; ymd.add({days: 1})) {
                    table[ymd.toYMD()] = {};
                    stages.forEach(function (x) { table[ymd.toYMD()][x] = 0; });
                }

                project.issueLogs.forEach(function (issue) {
                    var logs = issue.logs;
                    for (var i = 0; i < logs.length; i++) {
                        var lim = i + 1 === logs.length ? end : logs[i + 1].created_at;
                        for (var ymd = new Date(logs[i].created_at); ymd < lim; ymd.add({days: 1})) {
                            table[ymd.toYMD()][logs[i].stage]++;
                        }
                    }
                });

                project.cfd = table;
                res.push(project);
            });

            next(null, res);
        },
        // formst cfd tsv
        function (projects, next) {
            projects.forEach(function (project) {
                var tsv = [];
                tsv.push('ymd\t' + stages.join('\t'));
                _.forEach(project.cfd, function (xs, ymd) {
                    var line = [];
                    line.push(ymd);
                    stages.forEach(function (stage) {
                        line.push(xs[stage] || 0);
                    });
                    tsv.push(line.join('\t'));
                });
                project.cfdtsv = tsv.join('\n');
            });
            next(null, projects);
        },
        // dump
        function (logs, next) {
            var fileFormat = _.template('{projectName}_{projectId}_{datetime}.tsv',
                {interpolate: /{([\s\S]+?)}/g});

            logs.forEach(function (log) {
                var path = STORE_PATH + '/' + fileFormat({
                    projectName: log.project.name,
                    projectId: log.project.id,
                    datetime: (new Date()).toFormat('YYMMDD_HH24MISS')
                });

                fs.writeFileSync(path, log.cfdtsv);
                console.log('created: ' + path);
            });
            next(null);
        }
    ], function (err, res) {
        done(err, res);
    });
}
