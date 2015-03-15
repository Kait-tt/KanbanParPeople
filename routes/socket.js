var socketio = require('socket.io');
var _ = require('underscore');
var sessionMiddleware = require('../lib/module/sessionMiddleware');
var Project = require('../lib/model/Project');

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

            Project.removeMember({id: projectId}, targetUserName, function (err) {
                if (err) { serverErrorWrap(fn, err); return; }

                successWrap(fn, 'removed member');
            });
        });

        // 切断
        socket.on('disconnect', function () {
            console.log('disconnected: ' + socket.id);
            delete users[socket.id];
        });
    });

    /**** emitter *****/


    /**** helper *****/

    function joinProjectRoom(socket, projectRoomId) {
        socket.join(projectRoomId);
        users[socket.id].projectRoomId = projectRoomId;
    }

    function leaveProjectRoom(socket) {
        var projectRoomId = users[socket.id].projectRoomId;

        if (projectRoomId) {
            socket.leave(projectRoomId);
        }
    }

    function serverErrorWrap(fn, err, otherParam) {
        console.err(err);
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