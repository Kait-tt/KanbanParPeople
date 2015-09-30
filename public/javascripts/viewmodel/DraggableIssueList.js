(function (_, util) {
    'use strict';

    var viewmodel = util.namespace('kpp.viewmodel'),
        defaultOptions = {
            onUpdatedStage: _.noop,
            onUpdatedPriority: _.noop
        };

    viewmodel.DraggableIssueList = viewmodel.DraggableIssueList || DraggableIssueList;

    /**
     * DraggableUI 用の IssueList
     * 指定されたStage, Assigneeに一致するIssueListを生成・管理する
     *
     * 本クラスのインスタンスが持つIssueListをSlave, 全てのIssueが含まれたIssueListをMasterとする
     * When updated related issue's stage or assignee, or added in master issues
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
     * @constructor
     */
    function DraggableIssueList(o) {
        this.opts = _.defaults(_.clone(o || {}), defaultOptions);
        this.masterIssues = this.opts.masterIssues;
        this.stage = this.opts.stage;
        this.assignee = this.opts.assignee;
        this.id = _.uniqueId();

        // リストを畳み込むか
        this.isCollapse = ko.observable(true);

        // issue の監視プロパティ名と、subscriptionを格納するプロパティ名（重複して監視しないようにするため）
        this.issueSubscriptionParams = [
            {targetProperty: 'stage', subscriptionName: '_draggableIssueList_subscriptionStage_' + this.id},
            {targetProperty: 'assignee', subscriptionName: '_draggableIssueList_subscriptionAssignee_' + this.id}
        ];

        // slave issue list
        // rateLimit設定したいけど、設定するとsortable-uiが綺麗に動かない
        this.issues = ko.observableArray();
        this.issues.parent = this;

        // create issues
        this.allUpdateIssues(this.masterIssues);

        // subscribe
        this.subscribeMasterIssues(this.masterIssues);
        this.masterIssues().forEach(this.subscribeIssue.bind(this));
        this.subscribeSlaveIssues(this.issues);
    }

    // slave issue list の変更を監視する
    DraggableIssueList.prototype.subscribeSlaveIssues = function (slaveIssues) {
        slaveIssues.subscribe(function (changes) {
            // deleted の後に必ず added が来るはずなので、deleted は無視する
            _.where(changes, {status: 'added'}).forEach(function (change) {
                var issue = change.value;

                // stage, assignee の変更
                if (!this.matchCondition(issue)) {
                    this.opts.onUpdatedStage(issue, this.stage, this.assignee);
                }

                // priority の変更
                if (!this.needUpdatePriority(issue, this.masterIssues, this.issues)) {
                    var afterIssue = this.getIssueInsertBeforeOf(issue, this.masterIssues, this.issues);
                    if (afterIssue) {
                        this.opts.onUpdatedPriority(issue, afterIssue);
                    }
                }
            }, this);

        }, this, 'arrayChange');
    };

    // master issue list の変更を監視する
    DraggableIssueList.prototype.subscribeMasterIssues = function (masterIssues) {
        masterIssues.subscribe(function (changes) {
            // deleted は後で必ず added が行われるので無視する
            var issues = _.chain(changes).where({status: 'added'}).pluck('value').value();

            // 新しいIssueを監視する
            issues.forEach(this.subscribeIssue.bind(this));

            // 関連するIssueが変更されていたら、slave issue list を作り直す
            if (_.some(issues, this.isRelatedIssue.bind(this))) {
                this.allUpdateIssues(masterIssues);
            }
        }, this, 'arrayChange');
    };

    // issueの変更を監視する
    DraggableIssueList.prototype.subscribeIssue = function (issue) {
        // 監視プロパティが更新されたら、slave issue list を作り直す
        this.issueSubscriptionParams.forEach(function (sub) {
            if (!issue[sub.subscriptionName]) {  // 重複subscribe防止
                issue[sub.subscriptionName] = issue[sub.targetProperty].subscribe(function (value) {
                    if (this.isRelatedIssue(issue)) {
                        this.allUpdateIssues(this.masterIssues);
                    }
                }.bind(this));
            }
        }, this);
    };

    // 関わりあるIssueか
    // slave issue list で監視している issue が存在する または
    // stage, assignee が match する issue が存在する
    DraggableIssueList.prototype.isRelatedIssue = function (issue) {
        return this.existsId(issue._id()) || this.matchCondition(issue);
    };

    // slave issue list を作り直す
    // ただし、observableArrayは別で利用されている場合があるので、arrayの中身だけ入れ替える
    DraggableIssueList.prototype.allUpdateIssues = function (masterIssues) {
        var match = this.matchCondition.bind(this),
            nextIssues = masterIssues().filter(match);

        // pushやremoveを使うとうまい具合に通知してくれない
        var args = nextIssues;
        args.unshift(this.issues().length);
        args.unshift(0);
        this.issues.splice.apply(this.issues, args);
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

    // target issue を master issue の配置すべき一の後ろのIssueを返す
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

    // リストの畳み込みフラグを切り替える
    DraggableIssueList.prototype.toggleCollapse = function () {
        this.isCollapse(!this.isCollapse());
    };

    // issueが指定されたフィルター条件に合うか
    DraggableIssueList.prototype.matchCondition = function (issue) {
        return issue.stage() === this.stage && issue.assignee() === this.assignee;
    };

    // IDが一致するissueが存在するか
    DraggableIssueList.prototype.existsId = function (needleIssueId) {
        return !!_.find(this.issues(), function (issue) { return issue._id() === needleIssueId; });
    }

}(_, window.nakazawa.util));