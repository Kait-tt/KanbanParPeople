var express = require('express');
var router = express.Router();

router.get('/:project', function (req, res) {
    var project = req.param.project;

    res.render('kanban', {
        title: project + ' | KanbanParPeople',
        displayTitle: project + ' | KanbanParPeople'
    });
});

module.exports = router;