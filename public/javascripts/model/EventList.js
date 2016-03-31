(function (_, util) {
    'use strict';

    var model = util.namespace('kpp.model');

    model.EventList = model.EventList || EventList;

    function EventList(socket) {
        this.init(socket);
    }

    EventList.prototype.init = function (socket) {
        this.socket = socket;
        this.texts = ko.observableArray();
        this.items = ko.observableArray();

        Object.keys(socket._callbacks).forEach(function (key) {
            socket.on(key, function (res) {
                this.pushEvent(res);
            }.bind(this));
        }.bind(this));

        this.pushEvent('hello, world!');
    };

    EventList.prototype.pushEvent = function (event) {
        this.items.push(event);
        this.texts.push('> ' + JSON.stringify(event));
    };

}(_, window.nakazawa.util));