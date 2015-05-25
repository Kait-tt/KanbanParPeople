var express = require('express');
var router = express.Router();
var socket = require('./socket');
var async = require('async');
var Project = require('../lib/model/project');
var User = require('../lib/model/user');
var GitHub = require('../lib/model/github');
var stages = require('../lib/model/stages');

// GitHub Webhooks のルーティング

var routes = {
    issues: {
        // issue 作成
        opened: function (req, res) {
            var issue;
            var projectId;

            async.series([
                // project
                function (next) {
                    Project.findOne({
                        'github.userName': req.body.repository.owner.login,
                        'github.repoName': req.body.repository.name
                    }, function (err, doc) {
                        if (err) { next(err); }
                        else if (!doc) { next(new Error('project not found')); }
                        else {
                            projectId = doc._id;
                            next(null);
                        }
                    });
                },
                // issue
                function (next) {
                    GitHub.serializeIssue(req.body.issue, function (err, data) {
                        issue = data;
                        next(err);
                    });
                }
            ], function (err) {
                if (err && err.message === 'project not found') {
                    res.status(400).json({message: err.message});
                } else if (err) {
                    console.error(err);
                    res.status(500).json({message: err.message});
                } else {
                    socket.emitters.addIssue(projectId, null, issue, function (){ });
                    res.status(200).json({});
                }
            });
        }
    }
};

router.post('/', function (req, res) {
    var type = req.get('x-Github-Event');
    var action = req.body && req.body.action;

    if (!~Object.keys(routes).indexOf(type) ||
        !~Object.keys(routes[type]).indexOf(action)) {
        res.status(400).end();
    } else {
        routes[type][action](req, res);
    }
});

module.exports = router;
