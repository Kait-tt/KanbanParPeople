var express = require('express');
var router = express.Router();
var Project = require('../lib/model/project');
var stageTypes = require('../lib/model/stageTypes');
var _  = require('lodash');

var stages = _.filter(_.values(stageTypes), {visible: true});
var assignedStageNamesJSON = JSON.stringify(_.map(_.filter(stages, {assigned: true}), 'name'));

router.get('/:projectId/:projectName', function (req, res, next) {
    var id = req.params.projectId;
    var projectName = req.params.projectName;
    var mustLogin = req.params.mustLogin === '1';
    var logined = req.isAuthenticated && req.isAuthenticated();
    var userName = req.user ? req.user.username : null;

    Project
        .findOne({
            id: id,
            name: projectName
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
                mustLogin: mustLogin,
                userName: userName
            });
        });

});

module.exports = router;