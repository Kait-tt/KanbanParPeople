var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
    var mustLogin = req.params.mustLogin === '1';
    var logined = req.isAuthenticated && req.isAuthenticated();
    var userName = req.user ? req.user.username : null;

    res.render('log', {
        title: 'Log',
        displayTitle: 'Log',
        logined: logined,
        logType: 'all',
        mustLogin: mustLogin,
        userName: userName
    });
});

router.get('/api', function (req, res) {
    var mustLogin = req.params.mustLogin === '1';
    var logined = req.isAuthenticated && req.isAuthenticated();
    var userName = req.user ? req.user.username : null;

    res.render('log', {
        title: 'Log',
        displayTitle: 'Log',
        logType: 'api',
        logined: logined,
        mustLogin: mustLogin,
        userName: userName
    });
});

router.get('/socket', function (req, res) {
    var mustLogin = req.params.mustLogin === '1';
    var logined = req.isAuthenticated && req.isAuthenticated();
    var userName = req.user ? req.user.username : null;

    res.render('log', {
        title: 'Log',
        displayTitle: 'Log',
        logType: 'socket',
        logined: logined,
        mustLogin: mustLogin,
        userName: userName
    });
});

module.exports = router;
