(function (_, util) {
    'use strict';

    var model = util.namespace('kpp.model'),
        defaultOptions = { },
        columnKeys = [
            '_id',
            'name',
            'color',
            'created_at',
            'updated_at'
        ];

    model.Label = model.Label || Label;

    function Label(o) {
        this.opts = _.defaults(o || {}, defaultOptions);
        this.init(this.opts);

        // color�ɑ΂��Č��₷���F�i��or���j
        this.invertMonoColor = ko.computed(function () {
            var color = parseInt(this.color(), 16);
            var mono = Math.floor(((color & 0xff) + (color >> 2 & 0xff) + (color >> 4 & 0xff)) / 3);
            var invert = mono < 0x88 ? 0xff : 0x00;
            var invert16 = _.padLeft(invert.toString(16), 2, '0');
            return invert16 + invert16 + invert16;
        }, this);
    }

    Label.prototype.init = function (o) {
        _.each(columnKeys, function (key) { this[key] = ko.observable(o[key]); }.bind(this));
    };

}(_, window.nakazawa.util));