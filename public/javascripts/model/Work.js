(function (_, moment, util) {
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

    Work.clone = function (work) {
        var opts = {};
        _.each(columnKeys, function (key) {
            opts[key] = work[key]();
        });
        opts.members = work.members;
        return new Work(opts);
    };

    Work.prototype.init = function (o) {
        // isEndedの修正...
        if (!o.isEnded && o.userId && o.endTime) {
            o.isEnded = true;
        }

        _.each(columnKeys, function (key) { this[key] = ko.observable(o[key]); }.bind(this));

        // プロジェクトに所属しているMembers (オブジェクトを指定して監視する)
        this.members = o.members || ko.observableArray();

        this.isValidStartTime = ko.computed(function () {
            var start = moment(this.startTime());
            if (!start.isValid()) { return false; }
            if (this.endTime()) { return start.toDate() <= new Date(this.endTime()); }
            return true;
        }, this);

        this.isValidEndTime = ko.computed(function () {
            if (this.isEnded() && !this.endTime()) { return true; } // be working
            var end = moment(this.endTime());
            if (!end.isValid()) { return false; }
            return end.toDate() >= new Date(this.startTime());
        }, this);

        this.isValidUserId = ko.computed(function () {
            var userId = this.userId();
            var isEnded = this.isEnded();
            return (userId && isEnded) || (!userId && !isEnded);
        }, this);

        this.startTimeFormat = ko.computed({
            read: function () {
                return util.dateFormatYMDHM(this.startTime());
            },
            write: function (value) {
                // validかどうかに関係なく入れる。validチェックは他で。
                this.startTime(String(moment(value).toDate()));
            },
            owner: this
        });

        this.endTimeFormat = ko.computed({
            read: function () {
                return this.endTime() ? util.dateFormatYMDHM(this.endTime()) : null;
            },
            write: function (value) {
                // validかどうかに関係なく入れる。validチェックは他で。
                // ただし、空白のみの文字列はnullとして入れる
                this.endTime(_.isString(value) && !value.trim() ? null : String(moment(value).toDate()));
            },
            owner: this
        });

        this.duration = ko.computed(function () {
            var duration = this.calcDuration(false);
            return _.isNumber(duration) ? util.dateFormatHM(duration) : null;
        }, this);

        this.user = ko.computed(function () {
            return _.find(this.members(), function (user) { return user._id() === this.userId(); }.bind(this));
        }, this);

        this.userName = ko.computed(function () {
            return this.user() ? this.user().userName() : null;
        }, this);

        this.userName = ko.computed({
            read: function () {
                return this.user() ? this.user().userName() : null;
            },
            write: function (userName) {
                // システム的に無効なユーザ名が指定されることは無いはずなので、無効なユーザが指定されたときはnull入れるだけ
                var user = _.find(this.members(), function (user) { return user.userName() === userName; }.bind(this));
                this.userId(user ? user._id() : null);
            },
            owner: this
        });
    };

    // 作業時間の計算
    // force = true なら作業が終了していなくても現在時刻から作業時間を計算する
    Work.prototype.calcDuration = function (force) {
        var start = new Date(this.startTime());
        var end;
        if (this.endTime()) { // isEndedは正しくないときがあるので、endTimeがあるかで終了してるかを判断する
            end = new Date(this.endTime());
        } else if (force) {
            end = new Date();
        } else {
            return null;
        }

        // Dateはマイナスにしてはいけないので気を付けて計算する
        if (start < end) { return end - start; }
        else if (start > end) { return -(start - end); }
        else { return 0; }
    };

    // サーバDBと合わせたオブジェクト形式に変換する
    Work.prototype.toMinimumObject = function () {
        var res = {};
        columnKeys.forEach(function (key) {
            res[key] =  this[key]();
        }.bind(this));
        return res;
    };

}(_, moment, window.nakazawa.util));