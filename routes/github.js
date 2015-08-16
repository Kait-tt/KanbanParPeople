var express = require('express');
var router = express.Router();
var socket = require('./socket');
var async = require('async');
var Project = require('../lib/model/project');
var User = require('../lib/model/user');
var GitHub = require('../lib/model/github');
var stages = require('../lib/model/stages');
var _ = require('underscore');

// GitHub Webhooks のルーティング

var routes = {
    issues: {
        opened: function (project, req, res) {
            GitHub.serializeIssue(req.body.issue, function (err, issue) {
                if (err) {
                    console.error(err);
                    res.status(500).json({message: err.message});
                } else {
                    socket.emitters.addIssue(project.id, null, issue, _.noop);
                    res.status(200).json({});
                }
            });
        },
        closed: function (project, req, res) {
            var issue = _.find(project.issues, function (issue) {
                return issue.github && Number(issue.github.number) === req.body.issue.number;
            });

            if (issue) {
                socket.emitters.removeIssue(project.id, null, issue._id, _.noop);
                res.status(200).json({});
            } else {
                res.status(400).json({message: 'issue not found'});
            }
        },
        assigned: function (project, req, res) {
            var issue = _.find(project.issues, function (issue) {
                return issue.github && Number(issue.github.number) === req.body.issue.number;
            });

            if (!issue) {
                return res.status(400).json({message: 'issue not found'});
            }

            User.findOrCreate(req.body.issue.assignee.login, function (err, user) {
                if (err) {
                    console.error(err);
                    res.status(500).json({message: err.message});
                } else {
                    socket.emitters.updateIssue(project.id, null, issue._id, stages.todo, user._id, _.noop);
                    res.status(200).json({});
                }
            });
        },
        unassigned: function (project, req, res) {
            var issue = _.find(project.issues, function (issue) {
                return issue.github && Number(issue.github.number) === req.body.issue.number;
            });

            if (!issue) {
                return res.status(400).json({message: 'issue not found'});
            }
            
            socket.emitters.updateIssue(project.id, null, issue._id, stages.backlog, null, _.noop);
            res.status(200).json({});
        }
    }
};

router.post('/:projectId', function (req, res) {
    var type = req.get('x-Github-Event');
    var action = req.body && req.body.action;

    // projetの特定
    Project.findPopulated({id: req.params.projectId}, {one: true}, function (err, project) {
        if (err) {
            console.error(err);
            res.status(500).json({message: err.message});
            return;
        }
        if (!project) {
            console.error('project not found: ' + req.params.projectId);
            res.status(400).json({message: 'project not found'});
            return;
        }

        // ルーティング
        if (!~Object.keys(routes).indexOf(type) ||
            !~Object.keys(routes[type]).indexOf(action)) {
            console.error('routing not matched: ' + type + ' ' + action);
            res.status(400).end();
        } else {
            routes[type][action](project, req, res);
        }
    });
});

module.exports = router;
