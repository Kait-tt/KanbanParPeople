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
            // exists
            if (GitHub.findIssueByNumber(project, req.body.issue.number)) {
                console.error('issue already exists: ' + req.body.issue.number);
                return res.status(500).json({});
            }

            GitHub.serializeIssue(project, req.body.issue, function (err, issue) {
                if (err) {
                    console.error(err);
                    return res.status(500).json({message: err.message});
                }

                socket.emitters.addIssue(project.id, null, issue, _.noop);
                res.status(200).json({});
            });
        },
        closed: function (project, req, res) {
            var issue = GitHub.findIssueByNumber(project, req.body.issue.number);
            if (!issue) {
                return res.status(500).json({message: 'issue not found'});
            }

            // 変更の必要がなければ何もしない
            if (issue.stage === stages.archive || issue.stage === stages.done) {
                return res.status(200).json({});
            }
            
            socket.emitters.updateStage(project.id, null, issue._id, stages.done, null, _.noop);
            res.status(200).json({});
        },
        reopened: function (project, req, res) {
            var issue = GitHub.findIssueByNumber(project, req.body.issue.number);
            if (!issue) {
                return res.status(500).json({message: 'issue not found'});
            }

            // 変更の必要がなければ何もしない
            if (issue.stage !== stages.archive && issue.stage !== stages.done) {
                return res.status(200).json({});
            }

            socket.emitters.updateStage(project.id, null, issue._id, stages.issue, null, _.noop);
            res.status(200).json({});
        },
        assigned: function (project, req, res) {
            var issue = GitHub.findIssueByNumber(project, req.body.issue.number);
            if (!issue) {
                console.error('issue not found: ' + req.body.issue.number);
                return res.status(500).json({message: 'issue not found'});
            }

            var toAssignee = req.body.issue.assignee.login;

            if (issue.assignee) {
                User.findById(issue.assignee, function (err, user) {
                    if (err) {
                        console.error(err.message);
                        return res.status(500).json({message: err.message});
                    }
                    if (user.userName === toAssignee) {
                        // 変更の必要がなければ何もしない
                        console.log('already assigned');
                        res.status(200).json({message: 'already assigned'});
                    } else {
                        // assign
                        console.log('replace assign');
                        socket.emitters.updateStage(project.id, null, issue._id, stages.todo, user._id, _.noop);
                        res.status(200).json({});
                    }
                });
            } else {
                User.findOrCreate(toAssignee, function (err, user) {
                    if (err) {
                        console.error(err);
                        res.status(500).json({message: err.message});
                    } else {
                        console.log('assign: ' + JSON.stringify({issue: issue._id, user: user._id}));
                        socket.emitters.updateStage(project.id, null, issue._id, stages.todo, user._id, _.noop);
                        res.status(200).json({});
                    }
                });
            }
        },
        unassigned: function (project, req, res) {
            var issue = GitHub.findIssueByNumber(project, req.body.issue.number);
            if (!issue) {
                console.error('issue not found: ' + req.body.issue.number);
                return res.status(500).json({message: 'issue not found'});
            }

            // 変更が必要なければ何もしない
            if (issue.assignee === null) {
                return res.status(200).json({});
            }

            socket.emitters.updateStage(project.id, null, issue._id, stages.backlog, null, _.noop);
            res.status(200).json({});
        },
        labeled: function (project, req, res) {
            var issue = GitHub.findIssueByNumber(project, req.body.issue.number);
            if (!issue) {
                console.error('issue not found: ' + req.body.issue.number);
                return res.status(500).json({message: 'issue not found'});
            }

            issue.populate('labels', function (err, issue) {
                if (err) {
                    console.error(err.message + ': ' + req.body.issue.number);
                    return res.status(500).json({message: err.message});
                }

                // 存在しないラベル、あるいはカラーが異なる場合はラベルに関するすべての情報を更新する
                // GitHubと本システムで、名前とカラーは同じだが異なるラベルのような場合は、ここでは想定していない
                var label = project.findLabelByName(req.body.label.name);
                if (!label || String(label.color) !== String(req.body.label.color)) {
                    return syncLabelAll();
                }

                // 変更が必要なければ何もしない
                var issueLabel = _.find(issue.labels, function (x) { return String(x.name) === String(label.name); });
                if (issueLabel) {
                    return res.status(200).json({});
                }

                // ラベルを付ける
                socket.emitters.attachLabel(project.id, null, issue._id, label.name, _.noop);
                res.status(200).json({});
            });
        },
        unlabeled: function (project, req, res) {
            var issue = GitHub.findIssueByNumber(project, req.body.issue.number);
            if (!issue) {
                console.error('issue not found: ' + req.body.issue.number);
                return res.status(500).json({message: 'issue not found'});
            }

            issue.populate('labels', function (err, issue) {
                if (err) {
                    console.error(err.message + ': ' + req.body.issue.number);
                    return res.status(500).json({message: err.message});
                }

                // 存在しないラベル、あるいはカラーが異なる場合はラベルに関するすべての情報を更新する
                // GitHubと本システムで、名前とカラーは同じだが異なるラベルのような場合は、ここでは想定していない
                var label = project.findLabelByName(req.body.label.name);
                if (!label || String(label.color) !== String(req.body.label.color)) {
                    return syncLabelAll();
                }

                // 変更が必要なければ何もしない
                var issueLabel = _.find(issue.labels, function (x) { return String(x.name) === String(label.name); });
                if (!issueLabel) {
                    return res.status(200).json({});
                }

                // ラベルを外す
                socket.emitters.detachLabel(project.id, null, issue._id, label.name, _.noop);
                res.status(200).json({});
            });
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

function syncLabelAll(project, req, res) {
    console.log('unmatch project labels and sync all labels');
    var github = new GitHub();
    github.syncLabelsFromGitHub(project.github.repoName, project.github.userName, project, function (err, project) {
        if (err) {
            console.error(err);
            return res.status(500).json({message: err});
        }
        github.syncIssuesFromGitHub(project.github.repoName, project.github.userName, project, ['labels'], function (err, project) {
            if (err) {
                console.error(err);
                return res.status(500).json({message: err});
            } else {
                // TODO: emmit all sync labels
                return res.status(200).json({});
            }
        });
    });
}

module.exports = router;
