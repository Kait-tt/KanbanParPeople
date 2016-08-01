var express = require('express');
var router = express.Router();
var _ = require('lodash');
var Project = require('../lib/model/project');
var GitHub = require('../lib/model/github');
var Log = require('../lib/model/log');
var logger = new (require('../lib/model/loggerAPI'));

// Get Projects
router.get('/projects', logger.hook, function (req, res) {
    Project.findPopulatedByMemberName(req.user.username, function (err, projects) {
        if (err) { return serverError(res, err); }
        res.status(200).json({ message: 'OK', projects: projects });
    });
});

// Get a Project
router.get('/projects/:projectId', logger.hook, function (req, res) {
    Project.findPopulated({id: req.params.projectId}, {one: true}, function (err, project) {
        if (err) { return serverError(res, err); }
        (new GitHub(req.user.token)).fetchUserAvatar(project.members.map(function (member) { return member.user.userName; }), function (err) {
            if (err) { return serverError(res, err); }
            res.status(200).json({ message: 'OK', project: project });
        });
    });
});

// Remove a Project
router.delete('/projects/:projectId', logger.hook, function (req, res) {
    Project.remove({id: req.params.projectId}, function (err, project) {
        if (err) { return serverError(res, err); }
        res.status(200).json({ message: 'OK' });
    });
});

// Import Project
router.post('/projects', logger.hook, function (req, res) {
    if (!req.body.userName || !req.body.repoName) {
        return res.status(400).json({message: 'Required userName and repoName.'});
    }

    (new GitHub(req.user.token)).importProject(
        req.body.userName,
        req.body.repoName,
        req.user.username,
        function (err, project) {
            if (err) { return serverError(res, err); }

            Project.findPopulated({id: project.id}, {one: true}, function (err, doc) {
                if (err) { return serverError(res, err); }
                res.status(200).json({message: 'OK', project: doc });
            });
        });
});

// Get all logs
router.get('/logs', logger.hook, function (req, res) {
    getLogs(req, res);
});

// Get all logs (equals '/logs')
router.get('/logs/all', logger.hook, function (req, res) {
    getLogs(req, res);
});

// Get api logs
router.get('/logs/api', logger.hook, function (req, res) {
    getLogs(req, res, 'api');
});

// Get socket logs
router.get('/logs/socket', logger.hook, function (req, res) {
    getLogs(req, res, 'socket');
});

function getLogs(req, res, type) {
    var query = req.query || {};
    var skip = query.offset == null ? 0 : query.offset;
    var limit = query.limit == null ? 10: query.limit;
    var where = {};
    if (type) {
        where = {'values.type': type};
    }

    // スペースでand, -でignore
    // 全文検索する
    if (query.search) {
        var searchWhere = {'$and': query.search.split(' ').map(function (search) {
            if (search.length > 2 && search[0] === '-') {
                // 戦闘が '-' ならば ignore search
                return {text: {'$not': new RegExp(search.substr(1), 'i')}};
            } else {
                return {text: new RegExp(search, 'i')};
            }
        })};
        //where = where.concat(searchWhere);
        searchWhere['$and'].push(where);
        where = searchWhere;
    }

    Log.count(where, function (err, count) {
        if (err) { return serverError(res, err); }

        Log.find(where)
            .limit(limit)
            .skip(skip)
            .sort({created_at: 'desc' })
            .exec(function (err, docs) {
                if (err) { return serverError(res, err); }
                res.status(200).json({message: 'OK', logs: docs, total: count});
            });
    });
}

function serverError(res, err) {
    console.error(err && (err.stack || err));
    res.status(500).json({message: 'server error.', error: err.message });
}

module.exports = router;
