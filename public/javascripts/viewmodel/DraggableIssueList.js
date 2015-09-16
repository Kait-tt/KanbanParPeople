(function (_, util) {
    'use strict';

    var model = util.namespace('kpp.viewmodel'),
        defaultOptions = {
            onUpdatedStage: _.noop,
            onUpdatedPriority: _.noop,
            rateLimit: 100
        };

    model.DraggableIssueList = model.DraggableIssueList || DraggableIssueList;

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
     *          -. Issueとslaveのassignee, stage情報が異なる場合、 onUpdatedStage を発火
     *          -. 挿入後の前後との相対位置がmasterと異なる場合、最小の変更になるよう onUpdatedPriority を発火
     *              array pattern:   ※ o: updated issue, x: other issue
     *              1. |o|          no update
     *              2. |ox+|      check with master and insert to before x
     *              3. |x+ox*|   check with master and insert to before (x + 1)
     *      remove: この後必ずどこかのslaveでaddされるので何もしない
     *
     * @param o
     * @param {null|String} o.assignee              UserID or null
     * @param {nakazawa.model.stageTypes} o.stage   Stage
     * @param {ko.observableArray} o.masterIssues   Master issue list
     * @param {Function} o.onUpdatedStage            Callback which is fired on update stage or assignee
     * @param {Function} o.onUpdatedPriority         Callback which is fired on update priority
     * @param {Number} o.rateLimit                  Notify rate limit of issue list
     * @constructor
     */
    function DraggableIssueList(o) {
        this.opts = _.extend(o || {}, defaultOptions);
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
        this.subscribeMasterIssues(this.opts.masterIssues);
        this.opts.masterIssues.forEach(this.subscribeIssue.bind(this));
        this.subscribeSlaveIssues(this.issues);


        this.allUpdateIssues(this.opts.masterIssues);
    }

    // slave issue list の変更を監視する
    DraggableIssueList.prototype.subscribeSlaveIssues = function (slaveIssues) {
        slaveIssues.subscribe(function (changes) {
            // deleted の後に必ず added が来るはずなので、deleted は無視する
            _.where(changes, {status: 'added'}).forEach(function (change) {
                var issue = change.value, index = change.index;

                // stage, assignee に変更があるか
                if (!this.matchCondition(issue)) {
                    this.onUpdatedStage();
                }

                // priority に変更があるか
                // TODO: check priority
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
        var allUpdateIssue = this.allUpdateIssues.bind(this, this.opts.masterIssues);

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
        this.issues.splice(0, 0, nextIssues);
    };

    // issueが指定されたフィルター条件に合うか
    DraggableIssueList.prototype.matchCondition = function (issue) {
        return issue.stage() === this.opts.stage && issue.assignee() === this.opts.assignee;
    };

}(_, window.nakazawa.util));