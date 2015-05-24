var express = require('express');
var router = express.Router();
var Project = require('../lib/model/project');
var _  = require('underscore');

var stages = [
    {name: 'issue', displayName: 'Issue', assigned: false},
    {name: 'backlog', displayName: 'Backlog', assigned: false},
    {name: 'todo', displayName: 'TODO', assigned: true},
    {name: 'doing', displayName: 'Doing', assigned: true},
    {name: 'review', displayName: 'Review', assigned: true},
    {name: 'done', displayName: 'Done', assigned: false}
];

var assignedStageNamesJSON = JSON.stringify(_.pluck(_.where(stages, {assigned: true}), 'name'));

router.get('/:projectId/:projectName', function (req, res, next) {
    var id = req.params.projectId;
    var projectName = req.params.projectName;
    var userName = req.params.user;
    var mustLogin = req.params.mustLogin === '1';
    var logined = req.isAuthenticated && req.isAuthenticated();

    Project
        .findOne({
            id: id,
            name: projectName,
            userName: userName
        })
        .populate('create_user')
        .populate('members.user')
        .exec(function (err, project) {
            if (err) { next(err); return; }
            if (!project) { next(new Error('project not found')); return; }

            res.render('kanban', {
                title: project.name + ' | KanbanParPeople',
                displayTitle: project.name,
                project: project,
                stages: stages,
                assignedStageNamesJSON: assignedStageNamesJSON,
                logined: logined,
                mustLogin: mustLogin
            });
        });

});

module.exports = router;