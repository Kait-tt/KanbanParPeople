(function (_, util) {
    'use strict';

    var model = util.namespace('kpp.model'),
        defaultOptions = { },
        columnKeys = [
            '_id',
            'created_at',
            'userName',
            'wipLimit'
        ],
        stageTypeAssignedKeys = model.stageTypeAssignedKeys;

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

        // this['viewAll' + stage] = 各ステージのタスクをすべて表示するかのフラグ
        // this['toggleViewAll' + stage] = 各ステージのタスクをすべて表示するかのフラグを切り替える
        stageTypeAssignedKeys.forEach(function (stage) {
            this['viewAll' + stage] = ko.observable(false);
            this['toggleViewAll' + stage] = function () {
                this['viewAll' + stage](!this['viewAll' + stage]());
            }.bind(this);
        }, this);

        // 仕掛数
        this.wip = ko.computed(function () {
            return stageTypeAssignedKeys.reduce(function (sum, stage) {
                return sum + this[stage]().length;
            }.bind(this), 0);
        }, this, {deferEvaluation: true});

        // 仕掛数MAX
        this.isWipLimited = ko.computed(function () {
            return this.wip() >= this.wipLimit();
        }, this);

        // 可視
        this.visible = ko.observable(true);
    };

}(_, window.nakazawa.util));