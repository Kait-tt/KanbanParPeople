(function (_, util) {
    'use strict';

    var model = util.namespace('kpp.model'),
        stageTypeKeys = model.stageTypeKeys,
        stageTypes = model.stageTypes;

    model.ProjectStats = model.ProjectStats || ProjectStats;

    function ProjectStats(o) {
        this.init(o);
    }

    ProjectStats.prototype.init = function (o) {
        this.project = o.project;

        // 全作業時間の合計
        this.totalTime = ko.computed(function () {
            return _.sum(this.project.issues().map(function (issue) {
                return issue.allWorkTime();
            }));
        }, this);

        this.totalTimeFormat = ko.computed(function () {
            return util.dateFormatHM(this.totalTime());
        }, this);

        // ラベルごとの全作業時間の合計
        this.totalTimeLabels = ko.computed(function () {
            var noneKey = '(none)',
                res = {};
            res[noneKey] = 0;

            this.project.labels().forEach(function (label) {
                res[label.name()] = 0;
            });

            this.project.issues().forEach(function (issue) {
                var labels = issue.labels(),
                    time = issue.allWorkTime();
                if (labels.length) {
                    labels.forEach(function (label) {
                        res[label.name()] += time;
                    });
                } else {
                    res[noneKey] += time;
                }
            });

            return _.map(res, function (val, key) {
                return {name: key, time: val, format: util.dateFormatHM(val)};
            });
        }, this);
    };

}(_, window.nakazawa.util));