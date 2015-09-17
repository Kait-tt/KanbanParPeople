(function (_, util) {
    'use strict';

    var viewmodel = util.namespace('kpp.viewmodel'),
        defaultOptions = {
            onUpdatedStage: _.noop,
            onUpdatedPriority: _.noop,
            rateLimit: 100
        };

    viewmodel.DraggableIssueList = viewmodel.DraggableIssueList || DraggableIssueList;

    /**
     * DraggableUI 用の IssueList
     * 指定されたStage, Assigneeに一致するIssueListを生成・管理する
     *
     * 本クラスのインスタンスが持つIssueListをSlave, 全てのIssueが含まれたIssueListをMasterとする
     * When updated master issue's stage or assignee, or added (contains change priority)
     *      Slaveを作り直す（コストは若干かかるが、単純でバグりにくい）
     * When updated slave issues (Draggableで更新される)
     *      イベントを発火する
     *      add:
     *          -. Issueとslaveのassignee, stage情報が異なる場合、 onUpdatedStage を発火する
     *          -. 挿入後の前後との相対位置がmasterと異なる場合、最小の変更になるよう onUpdatedPriority を発火する
     *              array pattern:   ※ o: target issue, [xy_]: other issue
     *              1. |o|          no update
     *              2. |ox_*|       if target issue is not before x in master, insert to before x
     *              3. |_*xo|       if target issue is not after x in master, insert to before x + 1 in master
     *              4. |_*xoy_*|    if target issue is not after x and before y, insert to before x + 1 in master
     *      remove: この後必ずどこかのslaveでaddされるので何もしない
     *
     * @param o
     * @param {null|String} o.assignee              UserID or null
     * @param {nakazawa.model.stageTypes} o.stage   Stage
     * @param {ko.observableArray} o.masterIssues   Master issue list
     * @param {Function} o.onUpdatedStage           Callback which is fired on update stage or assignee
     *                                               Arguments are issue, stage and assignee
     * @param {Function} o.onUpdatedPriority        Callback which is fired on update priority
     *                                               Arguments are issue and issue which insert before of
     * @param {Number} o.rateLimit                  Notify rate limit of issue list
     * @constructor
     */
    function DraggableIssueList(o) {
        this.opts = _.extend(o || {}, defaultOptions);
        this.masterIssues = this.opts.masterIssues;
        this.stage = this.opts.stage;
        this.assignee = this.opts.assignee;
        this.id = _.uniqueId();

        // issue の監視プロパティ名と、subscriptionを格納するプロパティ名（重複して監視しないようにするため）
        this.issueSubscriptionParams = [
            {targetProperty: 'stage', subscriptionName: '_draggableIssueList_subscriptionStage_' + this.id},
            {targetProperty: 'assignee', subscriptionName: '_draggableIssueList_subscriptionAssignee_' + this.id}
        ];

        // slave issue list
        // all update issue 時に大量のnotifyをしないために、rateLimitを設定する
        this.issues = ko.observableArray().extend({rateLimit: {timeout: o.rateLimit, method: 'notifyWhenChangesStop '}});

        // subscribe
        this.subscribeMasterIssues(this.masterIssues);
        this.masterIssues().forEach(this.subscribeIssue.bind(this));
        this.subscribeSlaveIssues(this.issues);

        this.allUpdateIssues(this.masterIssues);
    }

    // slave issue list の変更を監視する
    DraggableIssueList.prototype.subscribeSlaveIssues = function (slaveIssues) {
        slaveIssues.subscribe(function (changes) {
            // deleted の後に必ず added が来るはずなので、deleted は無視する
            _.where(changes, {status: 'added'}).forEach(function (change) {
                var issue = change.value;

                // stage, assignee の変更
                if (!this.matchCondition(issue)) {
                    this.onUpdatedStage(issue, this.stage, this.assignee);
                }

                // priority の変更
                if (!this.needUpdatePriority(issue, this.masterIssues, this.issues)) {
                    var afterIssue = this.getIssueInsertBeforeOf(issue, this.masterIssues, this.issues);
                    if (afterIssue) {
                        this.onUpdatedPriority(issue, afterIssue);
                    }
                }
            }, this);

        }, this, 'arrayChange');
    };

    // master issue list の変更を監視する
    DraggableIssueList.prototype.subscribeMasterIssues = function (masterIssues) {
        masterIssues.subscribe(function (changes) {
            // 新しいIssueを監視する
            _.chain(changes)
                .where({status: 'added'})
                .pluck('issue')
                .forEach(this.subscribeIssue.bind(this));

            // added 変更が存在するならば slave issue list を作り直す
            if (_.findWhere(changes, {status: 'added'}) !== null) {
                this.allUpdateIssues();
            }
        }, this, 'arrayChange');
    };

    // issueの変更を監視する
    DraggableIssueList.prototype.subscribeIssue = function (issue) {
        var allUpdateIssue = this.allUpdateIssues.bind(this, this.masterIssues);

        // 各プロパティが更新されたら、slave issue list を作り直す
        this.issueSubscriptionParams.forEach(function (sub) {
            if (issue[sub.subscriptionName]) {  // 重複subscribe防止
                issue[sub.subscriptionName] = issue[sub.targetProperty].subscribe(allUpdateIssue);
            }
        }, this);
    };

    // slave issue list を作り直す
    // ただし、observableArrayは別で利用されている場合があるので、arrayの中身だけ入れ替える
    DraggableIssueList.prototype.allUpdateIssues = function (masterIssues) {
        var match = this.matchCondition.bind(this),
            nextIssues = masterIssues().filter(match);

        this.issues.removeAll();
        Array.prototype.push.apply(this.issues(), nextIssues);
    };

    // master issue list と slave issue list を比較して、priority に変更が必要かチェックする
    // 条件はクラスのコメント参照
    DraggableIssueList.prototype.needUpdatePriority = function (targetIssue, masterIssues, slaveIssues) {
        var slave = slaveIssues(),
            master = masterIssues();

        var slaveIdx = slave.indexOf(targetIssue);
        var masterIdx = master.indexOf(targetIssue);
        if (slaveIdx === -1) { throw new Error('added issue not found'); }
        // 1
        if (slave.length === 1) { return false; }
        // 2
        if (slaveIdx === 0) { return masterIdx < master.indexOf(slave[1]); }
        // 3
        if (slaveIdx === slave.length - 1) { return masterIdx > master.indexOf(slave[slaveIdx - 1]); }
        // 4
        return masterIdx > master.indexOf(slave[slaveIdx - 1]) &&
                masterIdx < master.indexOf(slave[slaveIdx + 1]);
    };

    DraggableIssueList.prototype.getIssueInsertBeforeOf = function (targetIssue, masterIssues, slaveIssues) {
        var slave = slaveIssues(),
            master = masterIssues();

        var slaveIdx = slave.indexOf(targetIssue);
        if (slaveIdx === -1) { throw new Error('added issue not found'); }
        // 1
        if (slave.length === 1) { return false; }
        // 2
        if (slaveIdx === 0) { return slave[1]; }
        // 3 and 4
        var beforeIdx = master.indexOf(slave[slaveIdx - 1]);
        return beforeIdx + 1 < master.length ? master[beforeIdx + 1] : null;
    };

    // issueが指定されたフィルター条件に合うか
    DraggableIssueList.prototype.matchCondition = function (issue) {
        return issue.stage() === this.stage && issue.assignee() === this.assignee;
    };

}(_, window.nakazawa.util));