var socketio = require('socket.io');
var _ = require('underscore');
var sessionMiddleware = require('../lib/module/sessionMiddleware');
var Project = require('../lib/model/Project');
var Issue = require('../lib/model/Issue');

module.exports = function (server) {
    var io = socketio.listen(server);
    var users = {};

    io.use(function (socket, next) {
        sessionMiddleware(socket.request, {}, next);
    });

    // 接続時
    io.sockets.on('connection', function (socket) {
        console.log('new connected: ' + socket.id);

        users[socket.id] = {
            info: !socket.request.session ? null :
                !socket.request.session.passport ? null :
                socket.request.session.passport.user
        };

        /***** イベント登録 *****/

        // プロジェクトルームに参加
        socket.json.on('join-project-room', function (req, fn) {
            req = req || {};
            fn = fn || function () {};
            var projectId = req.projectId;

            Project.exists({id: projectId}, function (err, isExists) {
                if (err) { serverErrorWrap(fn, err); return; }

                // invalid
                if (!isExists) {
                    userErrorWrap(fn, 'invalid projectId: ' + projectId);
                    return;
                }

                // valid
                leaveProjectRoom(socket);
                joinProjectRoom(socket, projectId);

                successWrap(fn, 'joined room');
            });
        });

        // memberの追放
        socket.json.on('remove-member', function (req, fn) {
            req = req || {};
            fn = fn || function () {};

            if (!checkAuth(socket, fn)) { return; }

            var projectId = users[socket.id].projectRoomId;
            var targetUserName = req.userName;

            removeMember(projectId, targetUserName, fn);
        });

        // memberの追加
        socket.json.on('add-member', function (req, fn) {
            req = req || {};
            fn = fn || function () {};

            if (!checkAuth(socket, fn)) { return; }

            var projectId = users[socket.id].projectRoomId;

            addMember(projectId, req.userName, fn);
        });

        // issueの追加
        socket.json.on('add-issue', function (req, fn) {
            req = req || {};
            fn = fn || function () {};

            if (!checkAuth(socket, fn)) { return; }

            var projectId = users[socket.id].projectRoomId;

            addIssue(projectId, req.title, req.body, fn);
        });

        // issueの削除
        socket.json.on('remove-issue', function (req, fn) {
            req = req || {};
            fn = fn || function () {};

            if (!checkAuth(socket, fn)) { return; }

            var projectId = users[socket.id].projectRoomId;

            removeIssue(projectId, req.issueId, fn);
        });

        // 切断
        socket.on('disconnect', function () {
            console.log('disconnected: ' + socket.id);
            delete users[socket.id];
        });
    });

    /**** emitter *****/

    function removeMember(projectId, targetUserName, fn) {
        Project.removeMember({id: projectId}, targetUserName, function (err, project, member) {
            if (err) { serverErrorWrap(fn, err); return; }

            successWrap(fn, 'removed member');
            io.to(projectId).json.emit('remove-member', {member: member});
        });
    }

    function addMember(projectId, targetUserName, fn) {
        Project.addMember({id: projectId}, targetUserName, function (err, project, member) {
            if (err) { serverErrorWrap(fn, err); return; }

            successWrap(fn, 'added member', {member: member});
            io.to(projectId).json.emit('add-member', {member: member});
        });
    }

    function addIssue(projectId, title, body, fn) {
        Issue.create({title: title, body: body}, function (err, issue) {
            if (err) { serverErrorWrap(fn, err); return; }

            Project.findOne({id: projectId}, function (err, project) {
                if (err) { serverErrorWrap(fn, err); return; }
                if (!project) { userErrorWrap(fn, 'undefined project', {projectId: projectId}); return; }

                project.issues.unshift(issue);

                project.save(function (err, project) {
                    if (err) { serverErrorWrap(fn, err); return; }

                    successWrap(fn, 'added issue', {issue: issue});
                    io.to(projectId).json.emit('add-issue', {issue: issue});
                });
            });
        });
    }

    function removeIssue(projectId, issueId, fn) {
        Project.removeIssue({id: projectId}, issueId, function (err, project, issue) {
            if (err) { serverErrorWrap(fn, err); return; }

            successWrap(fn, 'removed issue', {issue: issue});
            io.to(projectId).json.emit('remove-issue', {issue: issue});
        });
    }

    /**** helper *****/

    function joinProjectRoom(socket, projectRoomId) {
        socket.join(projectRoomId);
        users[socket.id].projectRoomId = projectRoomId;
    }

    function leaveProjectRoom(socket) {
        var user = users[socket.id];
        if (!user) { return; }
        var projectRoomId = user.projectRoomId;

        if (projectRoomId) {
            socket.leave(projectRoomId);
        }
    }

    function serverErrorWrap(fn, err, otherParam) {
        console.error(err);
        fn(_.extend({
            status: 'server error',
            message: err.message
        }, otherParam || {}));
    }

    function userErrorWrap(fn, message, otherParam) {
        fn(_.extend({
            status: 'error',
            message: message
        }, otherParam || {}));
    }

    function successWrap(fn, message, otherParam) {
        fn(_.extend({
            status: 'success',
            message: message
        }, otherParam || {}));
    }

    // passport と room をチェック
    function checkAuth(socket, fn) {
        var user = users[socket.id];

        if (!user) {
            serverErrorWrap(new Error('undefined user'), fn);
            return false;
        }

        if (!user.info) {
            userErrorWrap('must be login', fn);
            return false;
        }

        if (!user.projectRoomId) {
            userErrorWrap('must be join project room', fn);
            return false;
        }

        return true;
    }
};