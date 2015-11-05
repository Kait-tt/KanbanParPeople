var socketio = require('socket.io');
var _ = require('underscore');
var sessionMiddleware = require('../lib/module/sessionMiddleware');
var Project = require('../lib/model/project');
var stages = require('../lib/model/stages');
var LoggerSocket = require('../lib/model/loggerSocket');
var GitHub = require('../lib/model/github');
var queue = require('../lib/module/asyncQueue');


var io;
var emitters;

module.exports = {
    socket: socketRouting,
    emitters: null,
    io: null
};

function socketRouting(server) {
    io = socketio.listen(server);
    var loggerIO = new LoggerSocket.IO(io);
    module.exports.io = loggerIO.io;

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
            console.error('must be login: ' + socket.id);
            return;
        }

        var loggerSocket = new LoggerSocket.Socket(socket, user);

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
                loggerSocket.bindProjectId(projectId);

                successWrap('joined room', {}, fn);
            });
        });

        // memberの追放
        socketOn(socket, 'remove-member', function (req, projectId, fn) {
            emitters.removeMember(projectId, req.userName, fn);
        });

        // memberの追加
        socketOn(socket, 'add-member', function (req, projectId, fn) {
            emitters.addMember(projectId, user.info.token, req.userName, fn);
        });

        // memberの更新
        socketOn(socket, 'update-member', function (req, projectId, fn) {
            emitters.updateMember(projectId, user.info.token, req.userName, {wipLimit: req.wipLimit}, fn);
        });

        socketOn(socket, 'update-member-order', function (req, projectId, fn) {
            emitters.updateMemberOrder(projectId, req.userName, req.insertBeforeOfUserName, fn);
        });

        // issueの追加
        socketOn(socket, 'add-issue', function (req, projectId, fn) {
            emitters.addIssue(projectId, user.info.token, {title: req.title, body: req.body}, fn);
        });

        // issueの削除
        socketOn(socket, 'remove-issue', function (req, projectId, fn) {
            emitters.removeIssue(projectId, user.info.token, req.issueId, fn);
        });

        // update stage
        socketOn(socket, 'update-stage', function (req, projectId, fn) {
            emitters.updateStage(projectId, user.info.token, req.issueId, req.toStage, req.userId, fn);
        });

        // update issue
        socketOn(socket, 'update-issue-detail', function (req, projectId, fn) {
            emitters.updateIssueDetail(projectId, user.info.token, req.issueId, req.title, req.body, fn);
        });

        // update issue priority
        socketOn(socket, 'update-issue-priority', function (req, projectId, fn) {
            emitters.updateIssuePriority(projectId, req.issueId, req.insertBeforeOfIssueId, fn);
        });

        // 切断
        socket.on('disconnect', function () {
            console.log('disconnected: ' + socket.id);
            delete users[socket.id];
        });
    });

    /**** room *****/

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
}

module.exports.emitters = emitters = {
    removeMember: function (projectId, targetUserName, fn) {
        Project.removeMember({id: projectId}, targetUserName, function (err, project, member) {
            if (err) { serverErrorWrap(err, {}, fn); return; }

            successWrap('removed member', {}, fn);
            module.exports.io.to(projectId).emit('remove-member', {member: member});
        });
    },

    addMember: function (projectId, token, targetUserName, fn) {
        Project.addMember({id: projectId}, targetUserName, function (err, project, member) {
            if (err) { serverErrorWrap(err, {}, fn); return; }

            (new GitHub(token)).fetchUserAvatar([targetUserName], function (err, path) {
                if (err) { serverErrorWrap(err, {}, fn); return; }

                successWrap('added member', {member: member}, fn);
                module.exports.io.to(projectId).emit('add-member', {member: member});
            });
        });
    },

    updateMember: function (projectId, token, targetUserName, updateParams, fn) {
        Project.updateMember({id: projectId}, targetUserName, updateParams, function (err, project, member) {
            if (err) { serverErrorWrap(err, {}, fn); return; }

            successWrap('updated member', {member: member}, fn);
            module.exports.io.to(projectId).emit('update-member', {member: member});
        });
    },

    updateMemberOrder: function (projectId, userName, insertBeforeOfUserName, fn) {
        Project.updateMemberOrder({id: projectId}, userName, insertBeforeOfUserName, function (err, project, member, insertBeforeOfMember) {
            if (err) { serverErrorWrap(err, {}, fn); return; }

            successWrap('updated member order', {issue: member, insertBeforeOfMember: insertBeforeOfMember}, fn);
            module.exports.io.to(projectId).emit('update-member-order', {member: member, userName: userName,
                insertBeforeOfMember: insertBeforeOfMember, insertBeforeOfUserName: insertBeforeOfUserName, project: project});
        });
    },

    addIssue: function (projectId, token, params, fn) {
        Project.addIssue({id: projectId}, token, params, function (err, project, issue) {
            if (err) { serverErrorWrap(err, {}, fn); return; }

            successWrap('added issue', {issue: issue}, fn);
            if (issue) {
                module.exports.io.to(projectId).emit('add-issue', {issue: issue});
            }
        });
    },

    removeIssue: function (projectId, token, issueId, fn) {
        Project.removeIssue({id: projectId}, token, issueId, function (err, project, issue) {
            if (err) { serverErrorWrap(err, {}, fn); return; }

            successWrap('removed issue', {issue: issue}, fn);
            if (issue) {
                module.exports.io.to(projectId).emit('remove-issue', {issue: issue});
            }
        });
    },

    // ステージとアサインを同時に処理する
    updateStage: function (projectId, token, issueId, toStage, userId, fn) {
        Project.updateStage({id: projectId}, token, issueId, toStage, userId, function (err, project, issue) {
            if (err) { serverErrorWrap(err, {}, fn); return; }

            successWrap('updated stage', {issue: issue}, fn);
            module.exports.io.to(projectId).emit('update-stage', {issue: issue, issueId: issueId, toStage: toStage, assignee: userId});
        });
    },

    updateIssueDetail: function (projectId, token, issueId, title, body, fn) {
        Project.updateIssueDetail({id: projectId}, token, issueId, title, body, function (err, project, issue) {
            if (err) { serverErrorWrap(err, {}, fn); return; }

            successWrap('updated issue detail', {issue: issue}, fn);
            module.exports.io.to(projectId).emit('update-issue-detail', {issue: issue, issueId: issueId});
        });
    },

    updateIssuePriority: function (projectId, issueId, insertBeforeOfIssueId, fn) {
        Project.updateIssuePriority({id: projectId}, issueId, insertBeforeOfIssueId, function (err, project, issue, insertBeforeOfIssueId) {
            if (err) { serverErrorWrap(err, {}, fn); return; }

            successWrap('updated issue priority', {issue: issue, insertBeforeOfIssueId: insertBeforeOfIssueId}, fn);
            module.exports.io.to(projectId).emit('update-issue-priority', {issue: issue, issueId: issueId, insertBeforeOfIssueId: insertBeforeOfIssueId});
        });
    },

    attachLabel: function (projectId, token, issueId, labelName, fn) {
        queue.push(projectId, function (done) {
            Project.attachLabel({id: projectId}, token, issueId, labelName, function (err, project, issue, label) {
                done();
                if (err) { serverErrorWrap(err, {}, fn); return; }

                successWrap('attached label', {issue: issue, label: label}, fn);
                module.exports.io.to(projectId).emit('attach-label', {issue: issue, issueId: issueId, label: label});
            });
        });
    },

    detachLabel: function (projectId, token, issueId, labelName, fn) {
        queue.push(projectId, function (done) {
            Project.detachLabel({id: projectId}, token, issueId, labelName, function (err, project, issue, label) {
                done();
                if (err) { serverErrorWrap(err, {}, fn); return; }

                successWrap('detached label', {issue: issue, label: label}, fn);
                module.exports.io.to(projectId).emit('detach-label', {issue: issue, issueId: issueId, label: label});
            });
        });
    }
};

/*** helper ***/

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