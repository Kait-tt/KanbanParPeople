var express = require('express');
var router = express.Router();
var project = require('../lib/model/project');

// Import Project
router.post('/projects', function (req, res) {
    setTimeout(function () {
        res.status(200).json({message: 'OK'});
    }, 2000);
});

module.exports = router;
