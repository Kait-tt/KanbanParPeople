var socketio = require('socket.io');
var _ = require('underscore');
var sessionMiddleware = require('../lib/module/sessionMiddleware');
var Project = require('../lib/model/project');
var stages = require('../lib/model/stages');

var io;
var emitters;

module.exports = {
    socket: socketRouting,
    emitters: null,
    io: null
};

function socketRouting(server) {
    module.exports.io = io = socketio.listen(server);
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
            emitters.removeMember(projectId, req.userName, fn);
        });

        // memberの追加
        socketOn(socket, 'add-member', function (req, projectId, fn) {
            emitters.addMember(projectId, req.userName, fn);
        });

        // memberの更新
        socketOn(socket, 'update-member', function (req, projectId, fn) {
            emitters.updateMember(projectId, user.info.token, req.userName, {wipLimit: req.wipLimit}, fn);
        });

        // issueの追加
        socketOn(socket, 'add-issue', function (req, projectId, fn) {
            emitters.addIssue(projectId, user.info.token, {title: req.title, body: req.body}, fn);
        });

        // issueの削除
        socketOn(socket, 'remove-issue', function (req, projectId, fn) {
            emitters.removeIssue(projectId, user.info.token, req.issueId, fn);
        });

        // assign
        socketOn(socket, 'assign', function (req, projectId, fn) {
            emitters.assignIssue(projectId, user.info.token, req.issueId, req.userId, fn);
        });

        // update stage
        socketOn(socket, 'update-stage', function (req, projectId, fn) {
            emitters.updateStage(projectId, user.info.token, req.issueId, req.toStage, fn);
        });

        // update issue
        socketOn(socket, 'update-issue-detail', function (req, projectId, fn) {
            emitters.updateIssueDetail(projectId, user.info.token, req.issueId, req.title, req.body, fn);
        });

        // update issue priority
        socketOn(socket, 'update-issue-priority', function (req, projectId, fn) {
            emitters.updateIssuePriority(projectId, req.issueId, req.toPriority, fn);
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

    addMember: function (projectId, targetUserName, fn) {
        Project.addMember({id: projectId}, targetUserName, function (err, project, member) {
            if (err) { serverErrorWrap(err, {}, fn); return; }

            successWrap('added member', {member: member}, fn);
            module.exports.io.to(projectId).emit('add-member', {member: member});
        });
    },

    updateMember: function (projectId, token, targetUserName, updateParams, fn) {
        Project.updateMember({id: projectId}, targetUserName, updateParams, function (err, project, member) {
            if (err) { serverErrorWrap(err, {}, fn); return; }

            successWrap('updated member', {member: member}, fn);
            module.exports.io.to(projectId).emit('update-member', {member: member});
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

    assignIssue: function (projectId, token, issueId, userId, fn) {
        Project.findIssueById(projectId, issueId, function (err, beforeIssue, project) {
            if (err) { serverErrorWrap(err, {}, fn); return; }
            var beforeStage = beforeIssue.stage;

            project.assign(token, issueId, userId, function (err, project, issue) {
                if (err) { serverErrorWrap(err, {}, fn); return; }

                successWrap('assigned', {issue: issue}, fn);
                if (issue) {
                    module.exports.io.to(projectId).emit('assign', {issue: issue, issueId: issueId, memberId: userId});

                    // stageが変わっていたら通知
                    if (beforeStage !== issue.stage) {
                        emitters.updateStage(projectId, token, issueId, issue.stage, _.noop);
                    }
                }
            });
        });
    },

    updateStage: function (projectId, token, issueId, toStage, fn) {
        Project.updateStage({id: projectId}, issueId, toStage, function (err, project, issue) {
            if (err) { serverErrorWrap(err, {}, fn); return; }

            successWrap('updated stage', {issue: issue}, fn);
            module.exports.io.to(projectId).emit('update-stage', {issue: issue, issueId: issueId, toStage: toStage});

            // issue, backlogs, done は assignee を外す
            if (_.contains([stages.issue, stages.backlog, stages.done], toStage) && issue.assignee) {
                emitters.assignIssue(projectId, token, issueId, null, _.noop);
            }
        });
    },

    updateIssueDetail: function (projectId, token, issueId, title, body, fn) {
        Project.updateIssueDetail({id: projectId}, token, issueId, title, body, function (err, project, issue) {

            successWrap('updated issue detail', {issue: issue}, fn);
            module.exports.io.to(projectId).emit('update-issue-detail', {issue: issue, issueId: issueId});
        });
    },

    updateIssuePriority: function (projectId, issueId, toPriority, fn) {
        Project.updateIssuePriority({id: projectId}, issueId, toPriority, function (err, project, issue, toPriority) {

            successWrap('updated issue priority', {issue: issue, toPriority: toPriority}, fn);
            module.exports.io.to(projectId).emit('update-issue-priority', {issue: issue, issueId: issueId, toPriority: toPriority});
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