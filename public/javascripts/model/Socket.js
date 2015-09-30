(function (EventEmitter, _, io, util) {
    'use strict';

    var model = util.namespace('kpp.model'),
        defaultOptions = { };

    model.Socket = model.Socket || Socket;

    function Socket(o) {
        var that = io.connect();
        that.eventEmitCallback = new EventEmitter();

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
            that.emit = _.wrap(that.emit.bind(that), function (emit, key, req, fn) {
                console.log('emit: ' + key, req);
                emit(key, req, function (res) {
                    console.log('callback: ' + key, res);
                    if (fn) { fn.apply(this, arguments); }
                });
            });

        };

        // emitのcallbackをイベントで受け取れるようにする
        that.hookEventEmitCallback = function () {
            that.emit = _.wrap(that.emit.bind(that), function (emit, key, req, fn) {
                emit(key, req, function (res) {
                    that.eventEmitCallback.emit(key, req, res);
                    if (fn) { fn.apply(this, arguments); }
                });
            });
        };

        that.hookEventEmitCallback();
        return that;
    }

}(EventEmitter2, _, io, window.nakazawa.util));