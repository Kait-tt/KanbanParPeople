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
        opened: function (projectId, req, res) {
            GitHub.serializeIssue(req.body.issue, function (err, issue) {
                if (err) {
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

router.post('/:projectId', function (req, res) {
    var type = req.get('x-Github-Event');
    var action = req.body && req.body.action;

    // projetの特定
    Project.findOne({id: req.params.projectId}, function (err, project) {
        if (err) {
            console.error(err);
            res.status(500).json({message: err.message});
            return;
        }
        if (!project) {
            res.status(400).json({message: 'project not found'});
            return;
        }

        // ルーティング
        if (!~Object.keys(routes).indexOf(type) ||
            !~Object.keys(routes[type]).indexOf(action)) {
            res.status(400).end();
        } else {
            routes[type][action](project.id, req, res);
        }
    });
});

module.exports = router;
