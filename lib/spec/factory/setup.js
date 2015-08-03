var mongoose = require('mongoose');
var monky = new (require('monky'))(mongoose);
var async = require('async');
module.exports.monky = monky;

require('./user');
require('./issue');
require('./project');

module.exports.setup = function (callback) {
    async.series({
        user: function (next) { monky.create('User', next); },
        issueParams: function (next) { monky.build('Issue', next); },
        issues: function (next) { monky.createList('Issue', 3, next); },
        userParams: function (next) { monky.build('User', next); }
    }, function (err, res) {
        if (err) { return callback(err); }

        monky.create('Project', {
            create_user: res.user._id,
            issues: res.issues,
            members: [{user: res.user._id}]
        }, function (err, project) {
            if (err) { return callback(err); }
            res.project = project;
            callback(null, res);
        });
    });
};