var express = require('express');
var router = express.Router();
var project = require('../lib/model/projects');

// My Page
router.get('/me', function (req, res) {
    var userName = req.user.username;

    res.render('user', {
        title: userName + ' | KanbanParPeople',
        displayTitle: userName,
        user: req.user
    });
});

module.exports = router;
