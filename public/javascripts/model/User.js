(function (_, util) {
    'use strict';

    var ns = util.namespace('kpp.model'),
        defaultOptions = { },
        columnKeys = [
            '_id',
            'created_at',
            'userName'
        ],
        Issue = ns.Issue,
        stageTypeAssignedKeys = ns.stageTypeAssignedKeys;

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

        _.each(stageTypeAssignedKeys, function (key) {
            this[key] = ko.observableArray([]);
        }.bind(this));

        this.wipMax = ko.observable(_.random(4, 5));
        this.wip = ko.computed(function () {
            return _.reduce(stageTypeAssignedKeys, function (sum, stageKey) {
                return this[stageKey]().length + sum;
            }, 0, this);
        }, this);
    };

    User.prototype.assign = function (issue) {
        this.todo.push(issue);
        this.sortIssues('todo');
    };

    User.prototype.unassign = function (issue) {
        _.each(stageTypeAssignedKeys, function (key) {
            var index = _.findIndex(this[key](), function (x) { return x._id() === issue._id(); });
            if (index >= 0) {
                this[key].splice(index, 1);
            }
        }.bind(this));
    };

    User.prototype.sortIssues = function (stage) {
        this[stage].sort(Issue.sortFunc);
    };

}(_, window.nakazawa.util));