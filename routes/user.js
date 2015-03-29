var express = require('express');
var router = express.Router();
var project = require('../lib/model/project');

// My Page
router.get('/me', function (req, res) {
    var userName = req.user.username;
    var mustLogin = req.params.mustLogin === '1';
    var logined = req.isAuthenticated && req.isAuthenticated();

    res.render('user', {
        title: userName + ' | KanbanParPeople',
        displayTitle: userName,
        user: req.user,
        logined: logined,
        mustLogin: mustLogin
    });

});

module.exports = router;
