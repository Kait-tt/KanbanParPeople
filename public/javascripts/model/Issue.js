(function (_, util) {
    'use strict';

    var ns = util.namespace('kpp.model'),
        defaultOptions = { },
        columnKeys = [
            "_id",
            "assignee",
            "body",
            "title",
            "updated_at",
            "created_at",
            "github",
            "stage"
        ];

    ns.Issue = ns.Issue || Issue;

    function Issue(o) {
        o = o || {};
        this.opts = _.defaults(o || {}, defaultOptions);

        this.init(o);
    }

    Issue.prototype.init = function (o) {
        _.each(columnKeys, function (key) {
            this[key] = o[key];
        }.bind(this));
    };

    Issue.stageTypes = ['todo', 'doing', 'review', 'done'];

}(_, window.nakazawa.util));