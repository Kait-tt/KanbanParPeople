var express = require('express');
var router = express.Router();
var Project = require('../lib/model/project');

var stages = [
    {name: 'todo', displayName: 'TODO'},
    {name: 'doing', displayName: 'Doing'},
    {name: 'review', displayName: 'Review'},
    {name: 'done', displayName: 'Done'}
];

var stageNamesJSON = JSON.stringify(stages.map(function (stage) { return stage.name }));

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
        .populate('members.user')
        .exec(function (err, project) {
            if (err) { next(err); return; }
            if (!project) { next(new Error('project not found')); return; }

            res.render('kanban', {
                title: project.name + ' | KanbanParPeople',
                displayTitle: project.name + ' | KanbanParPeople',
                project: project,
                stages: stages,
                stageNamesJSON: stageNamesJSON
            });
        });

});

module.exports = router;