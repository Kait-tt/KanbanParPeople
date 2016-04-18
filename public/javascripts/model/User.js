(function (_, util) {
    'use strict';

    var model = util.namespace('kpp.model'),
        defaultOptions = { },
        columnKeys = [
            '_id',
            'created_at',
            'userName',
            'wipLimit',
            'visible'
        ],
        stageTypeAssignedKeys = model.stageTypeAssignedKeys,
        defaultCost = model.Issue.defaultCost;

    model.User = model.User || User;

    function User(o) {
        this.opts = _.defaults(o || {}, defaultOptions);
        this.init(this.opts);
    }

    User.prototype.init = function (o) {
        columnKeys.forEach(function (key) { this[key] = ko.observable(o[key]); }, this);

        // プロジェクト全体のIssues (オブジェクトを指定して監視する)
        this.issues = o.issues || ko.observableArray();

        // 担当Issues
        this.assignedIssues = ko.computed(function () {
            return this.issues().filter(function (issue) { return issue.assignee() === this._id(); }, this);
        }, this, {deferEvaluation: true});

        // this[stage] = 各ステージにある担当Issues
        stageTypeAssignedKeys.forEach(function (stage) {
            this[stage] = ko.computed(function () {
                return this.assignedIssues().filter(function (issue) { return issue.stage() === stage; });
            }, this, {deferEvaluation: true});
        }, this);

        // 作業中のIssue
        this.workingIssues = ko.computed(function () {
            return this.doing().filter(function (issue) { return issue.isWorking(); });
        }, this);

        // 作業開始からどのくらいの時間がたっているか
        this.workingTime = ko.computed(function () {
            var issues = this.workingIssues();
            if (!issues.length) { return 0; }
            return _.max(issues.map(function (x) { return x.lastWorkTime(); }));
        }, this);

        // 作業開始からどのくらいの時間がたっているか (h時間m分)
        this.workingTimeFormat = ko.computed(function () {
            return util.dateFormatHM(this.workingTime());
        }, this);

        // 仕掛数
        this.wip = ko.computed(function () {
            return this.assignedIssues().reduce(function (sum, issue) {
                var cost = Number(issue.cost());
                return sum + (cost ? cost : defaultCost);
            }.bind(this), 0);
        }, this, {deferEvaluation: true});

        // 仕掛数MAX
        this.isWipLimited = ko.computed(function () {
            return this.wip() >= this.wipLimit();
        }, this);

        // addedCostを足すとWIP制限を超過するか
        this.willBeOverWipLimit = function (addedCost) {
            return this.wip() + addedCost > this.wipLimit();
        };

        // アバターURL
        this.avatarUrl = ko.computed(function () {
            return '/users/' + this.userName() + '/avatar';
        }, this);
    };

}(_, window.nakazawa.util));