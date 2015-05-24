(function (_, util) {
    'use strict';

    var model = util.namespace('kpp.model'),
        User = model.User,
        Issue = model.Issue,
        stageTypeKeys = model.stageTypeKeys,
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
        ];

    model.Project = model.Project || Project;

    function Project(o) {
        this.opts = _.defaults(o || {}, defaultOptions);
        this.init(this.opts);
    }

    Project.prototype.init = function (o) {
        columnKeys.forEach(function (key) { this[key] = ko.observable(o[key]); }, this);

        this.issues = ko.observableArray();

        this.members = ko.observableArray();

        // issuesの初期化
        (o.issues || []).forEach(function (issue) { this.addIssue(issue, true); }, this);

        // issueはソートされている状態に保つ
        this.issues.subscribe(function () { this.issues.peek().sort(Issue.sortFunc); }.bind(this));

        // membersの初期化
        (o.members || []).forEach(function (member) { this.addMember(member, true); }, this);

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
            url: this.opts.url + '/' + this.id,
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

    // タスクをアサインする
    // memberId = null で unassigneIssue と同じ
    Project.prototype.assignIssue = function (issueId, memberId) {
        var issue = this.getIssue(issueId),
            member = this.getMember(memberId);

        if (!issue) {
            console.error('issue not found', issueId);
            return false;
        }

        if (member) {
            issue.assignee(memberId);
            issue.stage('todo');
        } else {
            // member = null <=> unassign
            this.unassignIssue(issueId);
        }
    };

    // タスクのアサインを解除する
    Project.prototype.unassignIssue = function (issueId) {
        var issue = this.getIssue(issueId);
        if (!issue) {
            console.error('issue not found');
            return false;
        }

        issue.assignee(null);
        issue.stage('backlog');
    };

    // タスクのステージを変更する
    Project.prototype.updateStage = function (issueId, toStage) {
        var issue = this.getIssue(issueId);

        if (!issue) {
            console.error('issue not found');
            return false;
        }

        issue.stage(toStage);
    };


    /*** helper ***/

    Project.prototype.addIssue = function (issue) {
        this.issues.push(new Issue(_.extend(issue, {members: this.members})));
    };

    Project.prototype.removeIssue = function (issue) {
        this.issues.remove(issue);
    };

    Project.prototype.getIssue = function (issueId) {
        return _.find(this.issues(), function (x) { return x._id() === issueId; });
    };


    Project.prototype.addMember = function (member) {
        this.members.push(new User(_.extend(member.user, {issues: this.issues})));
    };

    Project.prototype.removeMember = function (member) {
        this.members.remove(member);
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