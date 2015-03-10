var express = require('express');
var router = express.Router();
var Project = require('../lib/model/project');
var GitHub = require('../lib/model/github');

// Get Projects
router.get('/projects', function (req, res) {
    Project.findPopulated({userName: req.username}, {}, function (err, projects) {
        if (err) {
            res.status(500).json({
                message: 'server error.',
                error: err.message
            });
            return;
        }

        res.status(200).json({
            message: 'OK',
            projects: projects
        });
    });
});

// Get a Project
router.get('/projects/:projectId', function (req, res) {
    Project.findPopulated({id: req.params.projectId}, {one: true}, function (err, project) {
        if (err) {
            res.status(500).json({
                message: 'server error.',
                error: err.message
            });
            return;
        }

        res.status(200).json({
            message: 'OK',
            project: project
        });
    });
});

// Import Project
router.post('/projects', function (req, res) {
    if (!req.body.userName || !req.body.repoName) {
        res.status(400).json({message: 'Required userName and repoName.'});
        return;
    }

    (new GitHub(req.user.token)).importProject(
        req.body.userName,
        req.body.repoName,
        req.user.username,
        function (err, project) {
            if (err) {
                res.status(500).json({
                    message: 'server error.',
                    error: err.message
                });
                return;
            }

            Project.findPopulated({id: project.id}, {one: true}, function (err, doc) {
                if (err) {
                    res.status(500).json({
                        message: 'server error.',
                        error: err.message
                    });
                    return;
                }

                res.status(200).json({
                    message: 'OK',
                    project: doc
                });
            });
        });
});

module.exports = router;
