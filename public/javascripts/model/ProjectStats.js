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

        // work listを取得する
        this.getWorkList = () => {
            const res = [];

            this.project.issues().forEach(issue => {
                issue.workHistory().forEach(work => {
                    res.push(work);
                });
            });

            return res;
        };

        // 過去1週間の人ごとの作業時間
        // pastTimes()[iteration]
        // iteration = {start, startFormat, end, endFormat, users}
        // users[username] = {minutes, format}
        this.iterationWorkTime = ko.observableArray([]);

        // 過去1週間の人ごとの作業時間の計算
        this.calcIterationWorkTime = () => {
            return new Promise(resolve => setTimeout(() => {
                const userNames = this.project.members().map(x => x.userName());
                const works = this.getWorkList();

                const iterationTimes = 10;
                const beginDate = moment().day(-7 * (iterationTimes - 1));
                const endDate = moment().day(7);
                beginDate.set({'hours': 0, 'minutes': 0, 'seconds' : 0});
                endDate.set({'hours': 0, 'minutes': 0, 'seconds' : 0});
                const now = moment();

                const maxt = endDate.diff(beginDate, 'minutes');
                const ts = {};
                const n = maxt + 2;
                userNames.forEach(userName => ts[userName] = _.fill(Array(n), 0));

                works.forEach(work => {
                    const userName = work.userName();
                    if (userName && _.isArray(ts[userName])) {
                        const s = Math.max(0, moment(work.startTime()).diff(beginDate, 'minutes'));
                        const t = Math.max(0, moment(work.endTime() || now).diff(beginDate, 'minutes'));
                        ts[userName][s]++;
                        ts[userName][t]--;
                    }
                });

                userNames.forEach(userName => {
                    _.times(2, () => {
                        let sum = 0;
                        _.times(n, i => {
                            sum += ts[userName][i];
                            ts[userName][i] = sum;
                        });
                    });
                });

                const res = [];
                _.times(iterationTimes, i => {
                    const start = moment(beginDate).add(i * 7, 'days');
                    const end = moment(start).add(7, 'days').subtract(1, 'minutes');
                    const startFormat = start.format('MM/DD(ddd)');
                    const endFormat = end.format('MM/DD(ddd)');
                    const users = {};
                    const s = start.diff(beginDate, 'minutes');
                    const t = end.diff(beginDate, 'minutes');
                    userNames.forEach(username => {
                        const minutes = ts[username][t] - ts[username][s];
                        users[username] = {minutes, format: util.secondsFormatHM(minutes * 60)};
                    });
                    res.push({start, end, startFormat, endFormat, users});
                });

                this.iterationWorkTime(res);
                resolve(res);
            }, 0));
        };
    };

}(_, window.nakazawa.util));