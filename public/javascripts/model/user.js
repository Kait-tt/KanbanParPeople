(function (_, util) {
    'use strict';

    var ns = util.namespace('kpp.model'),
        defaultOptions = { },
        columnKeys = [
            '_id',
            'created_at',
            'userName'
        ],
        stageTypes = ns.Issue.stageTypes;

    ns.User = ns.User || User;

    function User(o) {
        o = o || {};
        this.opts = _.defaults(o || {}, defaultOptions);

        this.init(o);
    }

    User.prototype.init = function (o) {
        _.each(columnKeys, function (key) {
            this[key] = o[key];
        }.bind(this));

        _.each(stageTypes, function (key) {
            this[key] = ko.observableArray([]);
        }.bind(this))
    };

}(_, window.nakazawa.util));