var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
  res.render('index', {
      title: 'KanbanParPeople',
      displayTitle: 'KanbanParPeople'
  });
});

router.get('/kanban', function(req, res) {
    res.render('kanban', { title: 'KanbanParPeople' });
});

module.exports = router;
