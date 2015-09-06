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
            'name'
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

        // issuesの初期化
        (o.issues || []).reverse();
        (o.issues || []).forEach(function (issue) { this.addIssue(issue); }, this);

        // membersの初期化
        (o.members || []).forEach(function (member) { this.addMember(member); }, this);

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


    /*** helper ***/

    Project.prototype.addIssue = function (issue) {
        this.issues.unshift(new Issue(_.extend(issue, {members: this.members})));
    };

    Project.prototype.removeIssue = function (issue) {
        issue.stage(stageTypes.archive.name);
    };

    Project.prototype.getIssue = function (issueId) {
        return _.find(this.issues(), function (x) { return x._id() === issueId; });
    };


    Project.prototype.addMember = function (member) {
        this.members.unshift(new User(_.extend(member.user, {issues: this.issues, wipLimit: member.wipLimit})));
    };

    Project.prototype.removeMember = function (member) {
        this.members.remove(member);
    };

    Project.prototype.updateMember = function (member, params) {
        // wip update
        if (params && params.wipLimit) {
            member.wipLimit(params.wipLimit);
        }
    };

    Project.prototype.getMember = function (memberId) {
        return _.find(this.members(), function (x) { return x._id() === memberId; });
    };

    Project.prototype.getMemberByName = function (memberName) {
        return _.find(this.members(), function (x) { return x.userName() === memberName; });
    };


    function createUrl (userName, projectId, projectName) {
        return '/users/' + userName + '/projects/' + projectId + '/' + projectName;
    }

}(_, window.nakazawa.util));