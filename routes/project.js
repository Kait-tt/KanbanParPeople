var express = require('express');
var router = express.Router();
var Project = require('../lib/model/project');

router.get('/:projectId/:projectName', function (req, res, next) {
    var id = req.params.projectId;
    var projectName = req.params.projectName;
    var userName = req.params.user;

    Project
        .findOne({
            id: id,
            name: projectName,
            userName: userName
        })
        .populate('create_user')
        .populate('members.userId')
        .exec(function (err, project) {
            if (err) { next(err); return; }
            if (!project) { next(new Error('project not found')); return; }

            res.render('kanban', {
                title: project.name + ' | KanbanParPeople',
                displayTitle: project.name + ' | KanbanParPeople',
                project: project
            });
        });

});

module.exports = router;