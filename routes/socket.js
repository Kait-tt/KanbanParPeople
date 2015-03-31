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

        var user = {
            info: !socket.request.session ? null :
                !socket.request.session.passport ? null :
                    socket.request.session.passport.user
        };

        users[socket.id] = user;

        // ログインしていなかったら接続を切る
        if (!checkAuth(socket, function (message) { socket.disconnect(message); })) {
            return;
        }

        /***** イベント登録 *****/

        // プロジェクトルームに参加
        socket.on('join-project-room', function (req, fn) {
            req = req || {};
            fn = fn || function () {};
            var projectId = req.projectId;

            Project.exists({id: projectId}, function (err, isExists) {
                if (err) { serverErrorWrap(err, {}, fn); return; }

                // invalid
                if (!isExists) {
                    userErrorWrap('invalid projectId: ' + projectId, {}, fn);
                    return;
                }

                // valid
                leaveProjectRoom(socket);
                joinProjectRoom(socket, projectId);

                successWrap('joined room', {}, fn);
            });
        });

        // memberの追放
        socketOn(socket, 'remove-member', function (req, projectId, fn) {
            removeMember(projectId, req.userName, fn);
        });

        // memberの追加
        socketOn(socket, 'add-member', function (req, projectId, fn) {
            addMember(projectId, req.userName, fn);
        });

        // issueの追加
        socketOn(socket, 'add-issue', function (req, projectId, fn) {
            addIssue(projectId, user.info.token, req.title, req.body, fn);
        });

        // issueの削除
        socketOn(socket, 'remove-issue', function (req, projectId, fn) {
            removeIssue(projectId, req.issueId, fn);
        });

        // assign
        socketOn(socket, 'assign', function (req, projectId, fn) {
            assignIssue(projectId, req.issueId, req.userId, fn);
        });

        // update stage
        socketOn(socket, 'update-stage', function (req, projectId, fn) {
            updateStage(projectId, req.issueId, req.toStage, fn);
        });

        // update issue
        socketOn(socket, 'update-issue-detail', function (req, projectId, fn) {
            updateIssueDetail(projectId, req.issueId, req.title, req.body, fn);
        });

        // 切断
        socket.on('disconnect', function () {
            console.log('disconnected: ' + socket.id);
            delete users[socket.id];
        });
    });

    /**** emitter and function *****/

    function removeMember(projectId, targetUserName, fn) {
        Project.removeMember({id: projectId}, targetUserName, function (err, project, member) {
            if (err) { serverErrorWrap(err, {}, fn); return; }

            successWrap('removed member', {}, fn);
            io.to(projectId).emit('remove-member', {member: member});
        });
    }

    function addMember(projectId, targetUserName, fn) {
        Project.addMember({id: projectId}, targetUserName, function (err, project, member) {
            if (err) { serverErrorWrap(err, {}, fn); return; }

            successWrap('added member', {member: member}, fn);
            io.to(projectId).emit('add-member', {member: member});
        });
    }

    function addIssue(projectId, token, title, body, fn) {
        Project.addIssue({id: projectId}, {token: token, title: title, body: body}, function (err, project, issue) {
            if (err) { serverErrorWrap(err, {}, fn); return; }

            successWrap('added issue', {issue: issue}, fn);
            io.to(projectId).emit('add-issue', {issue: issue});
        });
    }

    function removeIssue(projectId, issueId, fn) {
        Project.removeIssue({id: projectId}, issueId, function (err, project, issue) {
            if (err) { serverErrorWrap(err, {}, fn); return; }

            successWrap('removed issue', {issue: issue}, fn);
            io.to(projectId).emit('remove-issue', {issue: issue});
        });
    }

    function assignIssue(projectId, issueId, userId, fn) {
        Project.assign({id: projectId}, issueId, userId, function (err, project, issue) {
            if (err) { serverErrorWrap(err, {}, fn); return; }

            successWrap('assigned', {issue: issue}, fn);
            io.to(projectId).emit('assign', {issue: issue, issueId: issueId, memberId: userId});
        });
    }

    function updateStage(projectId, issueId, toStage, fn) {
        Project.updateStage({id: projectId}, issueId, toStage, function (err, project, issue) {
            if (err) { serverErrorWrap(err, {}, fn); return; }

            successWrap('updated stage', {issue: issue}, fn);
            io.to(projectId).emit('update-stage', {issue: issue, issueId: issueId, toStage: toStage});
        });
    }

    function updateIssueDetail(projectId, issueId, title, body, fn) {
        Project.updateIssueDetail({id: projectId}, issueId, title, body, function (err, project, issue) {

            successWrap('updated issue detail', {issue: issue}, fn);
            io.to(projectId).emit('update-issue-detail', {issue: issue, issueId: issueId});
        });
    }

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

    /**** helper *****/

    function serverErrorWrap(err, otherParam, fn) {
        console.error('server error: ', err);
        console.error(err.stack);
        fn(_.extend({
            status: 'server error',
            message: err.message
        }, otherParam || {}));
    }

    function userErrorWrap(message, otherParam, fn) {
        console.error('user error: ' + message);
        fn(_.extend({
            status: 'error',
            message: message
        }, otherParam || {}));
    }

    function successWrap(message, otherParam, fn) {
        fn(_.extend({
            status: 'success',
            message: message
        }, otherParam || {}));
    }

    function socketOn(socket, eventName, callback) {
        socket.on(eventName, function (req, fn) {
            req = req || {};
            fn = fn || function () {};

            if (!checkAuth(socket, fn) || !checkUserInRoom(socket, fn)) { return; }

            var projectId = users[socket.id].projectRoomId;

            callback(req, projectId, fn);
        });
    }

    // passport をチェック
    function checkAuth(socket, fn) {
        var user = users[socket.id];

        if (!user) {
            serverErrorWrap(new Error('undefined user'), {}, fn);
            return false;
        }

        if (!user.info) {
            userErrorWrap('must be login', {}, fn);
            return false;
        }

        return true;
    }

    // roomに入っているか
    function checkUserInRoom(socket, fn) {
        var user = users[socket.id];

        if (!user) {
            serverErrorWrap(new Error('undefined user'), {}, fn);
            return false;
        }

        if (!user.projectRoomId) {
            userErrorWrap('must be join project room', {}, fn);
            return false;
        }

        return true;
    }
};