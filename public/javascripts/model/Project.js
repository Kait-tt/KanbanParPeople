(function (_, util) {
    'use strict';

    var model = util.namespace('kpp.model'),
        User = model.User,
        Issue = model.Issue,
        stageTypeKeys = model.stageTypeKeys,
        stageTypes = model.stageTypes,
        defaultOptions = {
            url: '/api/projects'
        },
        columnKeys = [
            '_id',
            'id',
            'create_user',
            'created_at',
            'github',
            'issues',
            'members',
            'name',
            'labels'
        ],
        githubColumnKeys = [
            'userName',
            'repoName',
            'url',
            'sync'
        ];

    model.Project = model.Project || Project;

    function Project(o) {
        this.opts = _.defaults(o || {}, defaultOptions);
        this.init(this.opts);
    }

    Project.prototype.init = function (o) {
        columnKeys.forEach(function (key) { this[key] = ko.observable(o[key]); }, this);
        if (!this.github()) { this.github({}); }
        githubColumnKeys.forEach(function (key) {
            this.github()[key] = ko.observable(o.github ? o.github[key] : null);
        }, this);

        this.issues = ko.observableArray();
        this.members = ko.observableArray();
        this.labels = ko.observableArray((o && o.labels) ? o.labels.map(function (x) { return new model.Label(x); }) : []);

        // issuesの初期化
        (o.issues || []).reverse();
        (o.issues || []).forEach(function (issue) { this.addIssue(issue); }, this);

        // membersの初期化
        (o.members || []).forEach(function (member) { this.addMember(member, {reverse: true}); }, this);

        // this.stages[stageName] = 各ステージにあるIssue
        this.stages = _.object(stageTypeKeys.map(function (stageName) {
            var stageArray = ko.computed(function () {
                return this.issues().filter(function (issue) { return issue.stage() === stageName; });
            }, this, {deferEvaluation: true});
            return [stageName, stageArray];
        }.bind(this)));

        // カンバンボードページのURL
        this.url = createUrl(this.create_user() ? this.create_user().userName : 'me',
            this.id(), this.name());
    };

    // プロジェクトを削除する
    Project.prototype.remove = function () {
        return $.ajax({
            url: this.opts.url + '/' + this.id(),
            type: 'delete',
            dataType: 'json'
        });
    };

    // プロジェクト情報をサーバから取得する
    Project.prototype.fetch = function (id) {
        return $.ajax({
            url: this.opts.url + '/' + id,
            type: 'get',
            dataType: 'json'
        }).then(function (res) {
            this.init(res.project);
        }.bind(this));
    };

    // タスクのステージ、アサインを変更する
    Project.prototype.updateStage = function (issueId, toStage, memberId) {
        var issue = this.getIssue(issueId),
            member = this.getMember(memberId);
        if (!issue) { throw new Error('issue not found'); }

        issue.stage(toStage);
        issue.assignee(member ? memberId : null);
    };

    Project.prototype.updateIssueWorkingState = function (issueId, isWorking, workHistory) {
        var issue = this.getIssue(issueId);
        if (!issue) { throw new Error('issue not found'); }
        
        issue.isWorking(isWorking);
        issue.updateWorkHistory(workHistory);
    };

    Project.prototype.updateIssueWorkHistory = function (issueId, workHistory) {
        var issue = this.getIssue(issueId);
        if (!issue) { throw new Error('issue not found'); }

        issue.updateWorkHistory(workHistory);
    };

    Project.prototype.updateIssuePriority = function (issueId, insertBeforeOfIssueId) {
        var issue = this.getIssue(issueId);
        if (!issue) { throw new Error('issue not found'); }

        var insertBeforeOfIssue = null;
        if (insertBeforeOfIssueId) {
            insertBeforeOfIssue = this.getIssue(insertBeforeOfIssueId);
            if (!insertBeforeOfIssue) { throw new Error('issue not found'); }
        }

        util.moveToBefore(this.issues, issue, insertBeforeOfIssue);
    };

    Project.prototype.updateMemberOrder = function (userName, insertBeforeOfUserName) {
        var member = this.getMemberByName(userName);
        if (!member) { throw new Error('member not found'); }

        var insertBeforeOfMember = null;
        if (insertBeforeOfUserName) {
            insertBeforeOfMember = this.getMemberByName(insertBeforeOfUserName);
            if (!insertBeforeOfMember) { throw new Error('member not found'); }
        }

        util.moveToBefore(this.members, member, insertBeforeOfMember);
    };

    Project.prototype.attachLabel = function (issueId, labelId) {
        var issue = this.getIssue(issueId);
        if (!issue) { throw new Error('issue not found'); }
        var label = this.getLabel(labelId);
        if (!label) { throw new Error('label not found'); }

        if (!_.includes(issue.labels(), label)) {
            issue.labels.push(label);
        }
    };

    Project.prototype.detachLabel = function (issueId, labelId) {
        var issue = this.getIssue(issueId);
        if (!issue) { throw new Error('issue not found'); }
        var label = this.getLabel(labelId);
        if (!label) { throw new Error('label not found'); }

        if (_.includes(issue.labels(), label)) {
            issue.labels.remove(label);
        }
    };

    Project.prototype.replaceLabelAll = function (newLabels, newIssues) {
        this.labels.splice(0, this.labels.slice().length, newLabels.map(function (x) { return new model.Label(x); }));
        // TODO: O(N^2) なので O(NlogN)に抑える
        newIssues.forEach(function (newIssue) {
            var issue = this.getIssue(newIssue._id);
            if (!issue) { return console.error('issue not found'); }
            issue.labels.splice(0, issue.labels().length,
                newIssue.labels.map(function (labelId) { return this.getLabel(labelId); }, this));
        }, this);
    };

    /*** helper ***/

    Project.prototype.addIssue = function (issue) {
        this.issues.unshift(new Issue(_.extend(issue, {
            members: this.members,
            labels: issue.labels.map(function (labelId) { return this.getLabel(labelId); }, this)
        })));
    };

    Project.prototype.removeIssue = function (issue) {
        issue.stage(stageTypes.archive.name);
    };

    Project.prototype.getIssue = function (issueId) {
        return _.find(this.issues(), function (x) { return x._id() === issueId; });
    };


    Project.prototype.addMember = function (member, o) {
        this.members[(o && o.reverse) ? 'push' : 'unshift'](new User(_.extend(member.user, {
            issues: this.issues,
            wipLimit: member.wipLimit,
            visible: member.visible
        })));
    };

    Project.prototype.removeMember = function (member) {
        this.members.remove(member);
    };

    Project.prototype.updateMember = function (member, params) {
        // wip update
        if (params && params.wipLimit && params.wipLimit !== member.wipLimit()) {
            member.wipLimit(params.wipLimit);
        }
        // visible update
        if (params && _.isBoolean(params.visible) && params.visible !== member.visible()) {
            member.visible(params.visible);
        }
    };

    Project.prototype.getMember = function (memberId) {
        return _.find(this.members(), function (x) { return x._id() === memberId; });
    };

    Project.prototype.getMemberByName = function (memberName) {
        return _.find(this.members(), function (x) { return x.userName() === memberName; });
    };

    Project.prototype.getLabel = function (labelId) {
        return _.find(this.labels(), function (x) { return x._id() === labelId; });
    };

    Project.prototype.getLabelByName = function (labelName) {
        return _.find(this.labels(), function (x) { return x.name() === labelName; });
    };

    function createUrl (userName, projectId, projectName) {
        return '/users/' + userName + '/projects/' + projectId + '/' + projectName;
    }

}(_, window.nakazawa.util));