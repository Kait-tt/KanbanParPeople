var express = require('express');
var router = express.Router();

router.get('/:project-name', function (req, res) {
    res.render('kanban', {title: 'KanbanParPeople'});
});

module.exports = router;
