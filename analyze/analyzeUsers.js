var mongoose = require('mongoose');
var config = require('config');
var async = require('async');
var _ = require('lodash');
var fs = require('fs');
require('date-utils');

var Project = require('../lib/model/project');
var User = require('../lib/model/user');
var Log = require('../lib/model/log');

var STORE_PATH = __dirname + '/store/userLog';

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
                _logs = docs;
                next(err);
            });
        },
        // count project api log each user
        function (next) {
            var res = _projects.map(function (project) {
                var users = project.members.map(function (member) {
                    var user = member.user;
                    var apiCount = _.chain(_logs)
                        .pluck('values')
                        .where({
                            type: 'api',
                            username: user.userName,
                            path: '/projects/:projectId',
                            method: 'GET'
                        })
                        .pluck('params')
                        .where({'projectId': project.id})
                        .value()
                        .length;
                    return {username: user.userName, userId: user._id, apiCount: apiCount};
                });
                return {projectName: project.name, projectId: project.id, users: users};
            });

            next(null, res);
        },
        // calculate access time
        function (projects, next) {
            projects.forEach(function (project) {
                project.users.forEach(function (user) {
                    var logs = _.chain(_logs)
                        .map(function (x) { return _.assign(x, x.values); })
                        .where({type: 'socket', action: 'on', username: user.username})
                        .filter(function (x) { return _.includes(['join-project-room', 'disconnect'], x.key); })
                        .value();

                    var totalMilliSeconds = _.chain(logs)
                        .groupBy('socketId')
                        .reduce(function (total, xs) {
                            var join = _.findWhere(xs, {key: 'join-project-room'});
                            var leave = _.findWhere(xs, {key: 'disconnect'});
                            return !join || !leave ? total : total + Number(new Date(leave.created_at) - new Date(join.created_at));
                        }, 0)
                        .value();

                    user.accessTimeMinute = Math.round(totalMilliSeconds / 1000 / 60);
                });
            });

            next(null, projects);
        },
        // count socket request times
        function (projects, next) {
            projects.map(function (project) {
                return project.users.map(function (user) {
                    var logs = _.chain(_logs)
                        .map(function (x) { return _.assign(x, x.values); })
                        .where({type: 'socket', action: 'on', username: user.username})
                        .value();

                    user.socketRequestTimes = _.chain(logs)
                        .groupBy('key')
                        .map(function (x, k) { return [k, x.length]; })
                        .zipObject()
                        .value();

                    user.totalOperationTimes = _.chain(user.socketRequestTimes)
                        .reduce(function (total, x, k) {
                            return _.includes(['join-project-room', 'disconnect'], k) ? 0 : total + x;
                        }, 0)
                        .value();
                });
            });

            next(null, projects);
        },
        // dump
        function (logs, next) {
            var fileFormat = _.template('{projectName}_{projectId}_{datetime}.json',
                {interpolate: /{([\s\S]+?)}/g});

            console.log(JSON.stringify(logs, null, '    '));

            next(null);
        }
    ], function (err, res) {
        done(err, res);
    });
}
