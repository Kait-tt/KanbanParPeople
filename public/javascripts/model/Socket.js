(function (_, io, util) {
    'use strict';

    var model = util.namespace('kpp.model'),
        defaultOptions = { };

    model.Socket = model.Socket || Socket;

    function Socket(o) {
        var that = io.connect();

        // ソケットのデバッグ出力を有効にする
        // on/emit時の内容をコンソールに出力する
        that.initSocketDebugMode = function () {
            // debug on event
            Object.keys(that._callbacks).forEach(function (key) {
                that.on(key, function (res) {
                    console.log('on: ' + key, res);
                });
            });

            // debug on emit
            that._emit = that.emit;
            that.emit = function (key, req, fn) {
                console.log('emit: ' + key, req);

                that._emit(key, req, function (res) {
                    console.log('callback: ' + key, res);

                    if (fn) {
                        fn.apply(this, arguments);
                    }
                });
            };
        };

        return that;
    }

}(_, io, window.nakazawa.util));