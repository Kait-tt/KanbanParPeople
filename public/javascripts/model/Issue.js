(function (_, util) {
    'use strict';

    var model = util.namespace('kpp.model'),
        defaultOptions = { },
        columnKeys = [
            '_id',
            'assignee',
            'body',
            'title',
            'isWorking',
            'updated_at',
            'created_at',
            'github',
            'stage',
            'cost',
            'assigneeMember',
            'displayTitle',
            'labels'
            // 'workHistory',
            // 'labels', // ids
            // 'alltext'
        ];

    model.Issue = model.Issue || Issue;

    function Issue(o) {
        this.opts = _.defaults(o || {}, defaultOptions);
        this.init(this.opts);
    }

    Issue.defaultCost = 3;
    Issue.calcAllWorkingIntervalTime = 1000 * 20; // 20 seconds

    Issue.prototype.init = function (o) {
        _.each(columnKeys, function (key) { this[key] = ko.observable(o[key]); }.bind(this));
        this.labels = ko.observableArray((o && o.labels) || []);
        this.workHistory = ko.observableArray(); // 後ろで初期化

        // プロジェクトに所属しているMembers (オブジェクトを指定して監視する)
        this.members = o.members || ko.observableArray();

        // カンバンボードに表示するか
        // 検索などで用いる
        this.visible = ko.observable(true);

        // 検索などに用いる全文テキスト（JSONではない）
        this.alltext = ko.computed(function () {
            var res = [];
            columnKeys.forEach(function (key) {
                var val = _.isFunction(this[key]) ? this[key]() : this[key];
                if (_.isObject(val) || _.isArray(val)) val = JSON.stringify(val);
                if (key === 'assigneeMember') key = 'assignee';
                res.push(key + ':' + val);
            }.bind(this));
            return res.join(' ');
        }, this, {deferEvaluation: true});

        // workHistoryのプロパティの更新
        this.updateWorkHistory = function (newWorkHistory) {
            this.workHistory(newWorkHistory.map(function (x) {
                return new model.Work(_.extend({members: this.members}, x));
            }.bind(this)));
        };
        this.updateWorkHistory(o.workHistory || []);

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

        // 合計作業時間の計算（ms）
        this.calcAllWorkTime = function () {
            return this.workHistory().reduce(function (sum, work) {
                return sum + work.calcDuration(true);
            }.bind(this), 0);
        };

        // 合計作業時間 (ms)
        this.allWorkTime = ko.observable(this.calcAllWorkTime());

        // 合計作業時間 (h時間m分)
        this.allWorkTimeFormat = ko.computed(function () {
            return util.dateFormatHM(this.allWorkTime());
        }, this);

        // 最後の作業時間
        this.lastWorkTime = ko.observable(0);

        // 最後の作業時間を計算
        this.calcLastWorkTime = function () {
            var history = this.workHistory();
            if (!history.length) { return 0; }
            return history[history.length - 1].calcDuration(true);
        };

        // 作業時間を一定期間おきに計算
        // ただし、いくつものIssueが同時に計算しないように最初にランダムにwaitを入れる
        var timeoutId = null;
        var calcAllWorkTimeIntervalFunc = function () {
            this.allWorkTime(this.calcAllWorkTime());
            this.lastWorkTime(this.calcLastWorkTime());

            if (this.isWorking()) {
                timeoutId = setTimeout(calcAllWorkTimeIntervalFunc, Issue.calcAllWorkingIntervalTime);
            } else {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
            }
        }.bind(this);

        this.isWorking.subscribe(calcAllWorkTimeIntervalFunc);
        if (this.isWorking()) {
            setTimeout(calcAllWorkTimeIntervalFunc, 1000);
        }

        this.workHistory.subscribe(function () {
            this.allWorkTime(this.calcAllWorkTime());
        }, this);
    };

}(_, window.nakazawa.util));