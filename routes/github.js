var express = require('express');
var router = express.Router();
var socket = require('./socket');
var async = require('async');
var Project = require('../lib/model/project');
var User = require('../lib/model/user');
var stages = require('../lib/model/stages');

// GitHub Webhooks のルーティング

var routes = {
    issues: {
        // issue 作成
        opened: function (req, res) {
            var issue = {
                title: req.body.issue.title,
                body: req.body.issue.body,
                assignee: null,
                stage: null,
                github: {
                    number: req.body.issue.number,
                    url: req.body.issue.url
                },
                created_at: new Date(req.body.issue.created_at),
                updated_at: new Date(req.body.issue.updated_at)
            };
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
                // assignee
                function (next) {
                    var assignee = req.body.issue.assignee;
                    if (!assignee) { next(null); return; }

                    User.findOrCreate(assignee.login, function (err, user) {
                        if (err) { next(err); }
                        else {
                            issue.assignee = user._id;
                            next(null);
                        }
                    });
                },
                // state
                function (next) {
                    if (req.body.issue.state === 'open') {
                        issue.stage = issue.assignee ? stages.todo : stages.issue;
                    } else {
                        issue.stage = stages.done;
                    }
                    next(null);
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
