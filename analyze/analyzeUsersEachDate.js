var mongoose = require('mongoose');
var config = require('config');
var async = require('async');
var _ = require('lodash');
var fs = require('fs');
require('date-utils');

var Project = require('../lib/model/project');
var Log = require('../lib/model/log');

var STORE_PATH = __dirname + '/store/userLogEachDate';
var END_DATE = new Date(); // new Date('2015/11/25'); // not contains

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
    var _logs, _projects;
    async.waterfall([
        // fetch projects
        function (next) {
            Project.findPopulated({}, {}, function (err, docs) {
                _projects = docs;
                next(err);
            });
        },
        // fetch logs
        function (next) {
            Log.find({}, function (err, docs) {
                _logs = (END_DATE ?
                    docs.filter(function (x) { return END_DATE.compareTo(new Date(x.created_at)) > 0; }) :
                    docs)
                // flatten
                    .map(function (x) {
                        x = _.assign(x, x.values);
                        _.each(x.params, function (v, k) { x['params_' + k] = v; });
                        _.each(x.req, function (v, k) { x['req_' + k] = v; });
                        return x;
                    });
                next(err);
            });
        },
        // count each date
        function (next) {
            var res = _projects.map(function (project) {
                var firstDate = new Date(project.created_at);
                var issueIds = _.pluck(project.issues  , '_id').map(String);

                var users = project.members.map(function (member) {
                    var user = member.user;
                    var apiDates = _.chain(_logs)
                        .where({
                            type: 'api',
                            username: user.userName,
                            path: '/projects/:projectId',
                            method: 'GET',
                            params_projectId: project.id
                        })
                        .pluck('created_at')
                        .map(function (x) { return new Date(x).toFormat('YYYY/MM/DD'); })
                        .value();

                    var operateDates = _.chain(_logs)
                        .where({
                            type: 'socket',
                            action: 'on',
                            username: user.userName
                        })
                        .filter(function (x) { return !_.includes(['join-project-room', 'disconnect'], x.key); })
                        .filter(function (x) { return x.projectId === project.projectId || _.includes(issueIds, x.req_issueId); })
                        .pluck('created_at')
                        .map(function (x) { return new Date(x).toFormat('YYYY/MM/DD'); })
                        .value();

                    var day = new Date(firstDate), endDay = END_DATE.toFormat('YYYY/MM/DD');
                    var d = day.toFormat('YYYY/MM/DD');
                    var cnts = [];
                    var filterPred = function (d, x) { return x === d; };
                    while (d !== endDay) {
                        cnts.push({
                            date: d,
                            access: apiDates.filter(filterPred.bind(null, d)).length,
                            operate: operateDates.filter(filterPred.bind(null, d)).length
                        });

                        day.add({days: 1});
                        d = day.toFormat('YYYY/MM/DD');
                    }

                    return {username: user.userName, userId: user._id, cnts: cnts};
                });
                return {projectName: project.name, projectId: project.id, users: users};
            });

            next(null, res);
        },
        // dump json
        function (logs, next) {
            var fileFormat = _.template('{projectName}_{projectId}_{datetime}.json',
                {interpolate: /{([\s\S]+?)}/g});

            logs.forEach(function (log) {
                var path = STORE_PATH + '/' + fileFormat({
                        projectName: log.projectName,
                        projectId: log.projectId,
                        datetime: (new Date()).toFormat('YYMMDD_HH24MISS')
                    });

                fs.writeFileSync(path, JSON.stringify(log, null, '    '));
                console.log('created: ' + path);
            });

            //console.log(JSON.stringify(logs, null, '    '));

            next(null, logs);
        },
        // dump tsv
        function (logs, next) {
            var fileFormat = _.template('{projectName}_{projectId}_{type}_{datetime}.tsv',
                {interpolate: /{([\s\S]+?)}/g});


            logs.forEach(function (log) {
                var headers = _.pluck(log.users, 'username');
                if (!headers.length) { return; }
                headers.unshift('date/name');
                var leftHeaders = _.pluck(log.users[0].cnts, 'date');

                ['access', 'operate'].forEach(function (type) {
                    var path = STORE_PATH + '/' + fileFormat({
                            projectName: log.projectName,
                            projectId: log.projectId,
                            datetime: (new Date()).toFormat('YYMMDD_HH24MISS'),
                            type: type
                        });

                    var vs = _.range(leftHeaders.length).map(function (i) {
                        return log.users.reduce(function (y, x) { return y.push(x.cnts[i][type]), y; }, [leftHeaders[i]]);
                    });

                    var tsv = [].concat(vs, [headers]);

                    //console.log(tsv);
                    fs.writeFileSync(path, vs.map(function (x) { return x.join('\t'); }).join('\n'));
                    console.log('created: ' + path);
                });
            });

            next(null);
        }
    ], function (err, res) {
        done(err, res);
    });
}
