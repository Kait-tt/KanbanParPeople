var express = require('express');
var router = express.Router();
var socket = require('./socket');

// GitHub Webhooks のルーティング

var routes = {
    issues: function (req, res) {
        socket.emitters.addIssue();
        res.status(200).end();
    }
};

router.post('/', function (req, res) {
    var type = req.get('x-Github-Event');

    if (!~Object.keys(routes).indexOf(type)) {
        res.status(400).end();
    } else {
        routes[type](req, res);
    }
});

module.exports = router;
