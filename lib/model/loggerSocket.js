var Log = require('./log');
var _ = require('lodash');
var log4js = require('log4js');

log4js.configure('log4js_setting.json');
var logger = log4js.getLogger('socket');

logger.info('begin');

/**
 * socket.ioの通信をロギングする
 * logSchemaへの書き込みと、log4jsの出力を行う
 *
 * @constructor
 */
function LoggerSocket(socket, user) {
    this.socket = socket;
    this.username = user.info.username;

    this.hookOnEvent(socket);
}

LoggerSocket.prototype.bindProjectId = function (projectId) {
    this.projectId = projectId;
};

LoggerSocket.prototype.hookOnEvent = function (socket) {
    var self = this;
    socket.on = _.wrap(socket.on.bind(socket), function (on, key, func) {
        on(key, self.loggingOnEvent.bind(self, key));
        on(key, function (res) {
            self.loggingOnCallback(key, res);
            func(res);
        });
    });
};

LoggerSocket.prototype.loggingOnEvent = function (key, req) {
    var params = {
        type    : 'socket',
        action  : 'on', key: key, socketId: this.socket.id,
        username: this.username, projectId: this.projectId, req: req
    };
    logger.info('on ' + key + ': ' + JSON.stringify(params));
    Log.logging(params);
};

LoggerSocket.prototype.loggingOnCallback = function (key, res) {
    var params = {
        type    : 'socket',
        action  : 'callback', key: key, socketId: this.socket.id,
        username: this.username, projectId: this.projectId, res: res
    };
    logger.info('callback ' + key + ': ' + JSON.stringify(params));
    Log.logging(params);
};

/**
 * socket.ioの通信をロギングする
 *
 * @constructor
 */
function LoggerIO(io) {
    this.io = io;
    this.hookEmit(io);
}

LoggerIO.prototype.hookEmit = function (io) {
    var self = this;
    io.sockets.emit = _.wrap(io.sockets.emit.bind(io.sockets), function (emit, key, req) {
        self.loggingEmit(io, key, req);
        emit(key, req);
    });
};

LoggerIO.prototype.loggingEmit = function (io, key, req) {
    var projectId = (io._rooms && io._rooms.length) ? io._rooms[0] : null;
    try {
        logger.info('emit ' + key + ': ' + JSON.stringify({projectId: projectId, req: req}));
        Log.logging({
            type: 'socket',
            action: 'emit', key: key, projectId: projectId, req: req
        });
    } catch (e) { }
};


module.exports = {
    Socket: LoggerSocket,
    IO: LoggerIO
};