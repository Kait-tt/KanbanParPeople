var express = require('express');
var router = express.Router();
var project = require('../lib/model/project');

// My Page
router.get('/me', function (req, res) {
    var mustLogin = req.params.mustLogin === '1';
    var logined = req.isAuthenticated && req.isAuthenticated();
    var userName = req.user ? req.user.username : null;

    res.render('user', {
        title: userName + ' | KanbanParPeople',
        displayTitle: userName,
        user: req.user,
        logined: logined,
        mustLogin: mustLogin,
        userName: userName
    });

});

module.exports = router;
