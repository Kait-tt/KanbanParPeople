var socketio = require('socket.io');
var _ = require('underscore');

module.exports = function (server) {
    var io = socketio.listen(server);

    // 接続時
    io.sockets.on('connection', function (socket) {
        console.log('new connected: ' + socket.id);

        /***** イベント登録 *****/

        // 切断
        socket.on('disconnect', function () {
            console.log('disconnected: ' + socket.id);
        });
    });

    /**** emitter *****/


};