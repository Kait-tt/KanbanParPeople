var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
    var mustLogin = req.params.mustLogin === '1';
    var logined = req.isAuthenticated && req.isAuthenticated();
    var userName = req.user.username;

    res.render('index', {
        title: 'KanbanParPeople',
        displayTitle: 'KanbanParPeople',
        logined: logined,
        mustLogin: mustLogin,
        userName: userName
    });
});

module.exports = router;
