(function (_, util) {
    'use strict';

    var model = util.namespace('kpp.model'),
        defaultOptions = { },
        columnKeys = [
            'startTime',
            'endTime',
            'isEnded',
            'userId'
            // 'user',
            // 'userName',
            // 'startTimeFormat',
            // 'endTimeFormat',
            // 'duration'
        ];

    model.Work = model.Work || Work;

    function Work(o) {
        this.opts = _.defaults(o || {}, defaultOptions);
        this.init(this.opts);
    }

    Work.prototype.init = function (o) {
        _.each(columnKeys, function (key) { this[key] = ko.observable(o[key]); }.bind(this));

        // プロジェクトに所属しているMembers (オブジェクトを指定して監視する)
        this.members = o.members || ko.observableArray();

        // 作業時間の計算
        // force = true なら作業が終了していなくても現在時刻から作業時間を計算する
        this.calcDuration = function (force) {
            var start = new Date(this.startTime());
            var end;
            if (this.endTime()) { // isEndedは正しくないときがあるので、endTimeがあるかで終了してるかを判断する
                end = new Date(this.endTime());
            } else if (force) {
                end = new Date();
            } else {
                return null;
            }
            return end - start;
        };

        this.startTimeFormat = ko.computed(function () {
            return util.dateFormatYMDHM(this.startTime());
        }, this);

        this.endTimeFormat = ko.computed(function () {
            return this.endTime() ? util.dateFormatYMDHM(this.endTime()) : '-';
        }, this);

        this.duration = ko.computed(function () {
            return (this.isEnded() && this.endTime()) ? util.dateFormatHM((new Date(this.endTime())) - (new Date(this.startTime()))) : '-';
        }, this);

        this.user = ko.computed(function () {
            return _.find(this.members(), function (user) { return user._id() === this.userId(); });
        }, this);

        this.userName = ko.computed(function () {
            return this.user() ? this.user().userName() : null;
        }, this);
    };

}(_, window.nakazawa.util));