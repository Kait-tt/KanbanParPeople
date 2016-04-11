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
            'stage',
            'cost',
            'labels' // ids
        ];

    model.Issue = model.Issue || Issue;

    function Issue(o) {
        this.opts = _.defaults(o || {}, defaultOptions);
        this.init(this.opts);
    }

    Issue.prototype.init = function (o) {
        _.each(columnKeys, function (key) { this[key] = ko.observable(o[key]); }.bind(this));
        this.labels = ko.observableArray((o && o.labels) || []);

        // プロジェクトに所属しているMembers (オブジェクトを指定して監視する)
        this.members = o.members || ko.observableArray();

        // アサインメンバー
        this.assigneeMember = ko.computed(function () {
            var userId = this.assignee();
            return _.find(this.members(), function (x) { return x._id() === userId; });
        }, this, {deferEvaluation: true});

        // 表示タイトル
        this.displayTitle = ko.computed(function () {
            var title = this.title();
            if (this.github() && this.github().number && this.github().number !== '0') {
                title = '#' + this.github().number + ' ' + title;
            }
            return title;
        }, this);
    };

}(_, window.nakazawa.util));