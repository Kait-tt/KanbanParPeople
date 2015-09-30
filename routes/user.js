var express = require('express');
var router = express.Router();
var project = require('../lib/model/project');
var fs = require('fs');
var _ = require('lodash');

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

router.get('/:username/avatar', function (req, res) {
    var dir = __dirname + '/../public/images/avatar/';
    fs.readdir(dir, function (err, files) {
        if (err) { return res.status(500).end(err); }
        var file = _.find(files, function (file) {
            return fs.statSync(dir + file).isFile() && _.startsWith(file, req.params.username + '.');
        });
        if (!file) { return res.status(500).end(req.params.username + '\'s avatar is not found'); }

        res.sendFile(file, {root: dir});
    });
});

module.exports = router;
