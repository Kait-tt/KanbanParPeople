(function (_, util) {
    'use strict';

    var model = util.namespace('kpp.model'),
        defaultOptions = { },
        columnKeys = [
            '_id',
            'assignee',
            'body',
            'title',
            'updated_at',
            'created_at',
            'github',
            'stage'
        ];

    model.Issue = model.Issue || Issue;

    function Issue(o) {
        this.opts = _.defaults(o || {}, defaultOptions);
        this.init(this.opts);
    }

    Issue.prototype.init = function (o) {
        _.each(columnKeys, function (key) { this[key] = ko.observable(o[key]); }.bind(this));

        // プロジェクトに所属しているMembers (オブジェクトを指定して監視する)
        this.members = o.members || ko.observableArray();

        // アサインメンバー
        this.assigneeMember = ko.computed(function () {
            var userId = this.assignee();
            return _.find(this.members(), function (x) { return x._id() === userId; });
        }, this, {deferEvaluation: true});
    };

    Issue.sortFunc = function (a, b) {
        return util.comp(a.created_at(), b.created_at(), true);
    };

}(_, window.nakazawa.util));