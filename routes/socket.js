var socketio = require('socket.io');
var _ = require('underscore');
var sessionMiddleware = require('../lib/module/sessionMiddleware');

module.exports = function (server) {
    var io = socketio.listen(server);

    io.use(function (socket, next) {
        sessionMiddleware(socket.request, {}, next);
    });

    // 接続時
    io.sockets.on('connection', function (socket) {
        var userId = socket.request.session.passport.user;
        console.log("Your User ID is", userId);

        console.log('new connected: ' + socket.id);

        /***** イベント登録 *****/

        // 切断
        socket.on('disconnect', function () {
            console.log('disconnected: ' + socket.id);
        });
    });

    /**** emitter *****/


};