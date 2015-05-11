(function (_, util) {
    'use strict';

    var ns = util.namespace('kpp.model'),
        User = ns.User,
        Issue = ns.Issue,
        stageTypes = ns.stageTypes,
        stageTypeKeys = ns.stageTypeKeys,
        stageTypeAssignedKeys = ns.stageTypeAssignedKeys,
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

    ns.Project = ns.Project || Project;

    function Project(o) {
        o = o || {};
        this.opts = _.defaults(o || {}, defaultOptions);

        this.init(o);
    }

    Project.prototype.init = function (o) {
        _.each(columnKeys, function (key) {
            this[key] = o[key];
        }.bind(this));

        this.stages = _.object(stageTypeKeys.map(function (stageName) {
            return [stageName, ko.observableArray()];
        }));

        this.members = ko.observableArray();
        (o.members || []).forEach(function (member) { this.addMember(member, true); }, this);

        this.issues = ko.observableArray();
        (o.issues || []).forEach(function (issue) { this.addIssue(issue, true); }, this);

        bindIssuesToMembers(this.members, this.issues);

        this.url = createUrl(this.create_user ? this.create_user.userName : 'me',
            this.id, this.name);
    };

    Project.prototype.remove = function () {
        return $.ajax({
            url: this.opts.url + '/' + this.id,
            type: 'delete',
            dataType: 'json'
        });
    };

    Project.prototype.fetch = function (id) {
        return $.ajax({
            url: this.opts.url + '/' + id,
            type: 'get',
            dataType: 'json'
        }).then(function (res) {
            this.init(res.project);
        }.bind(this));
    };

    Project.prototype.assignIssue = function (issueId, memberId) {
        var issue = _.find(this.issues(), function (x) { return x._id() === issueId; }),
            member = _.findWhere(this.members(), {_id: memberId}),
            oldAssigneeMember;

        if (!issue) {
            console.error('issue not found');
            return false;
        }

        // pull assigned
        if (issue.assignee()) {
            oldAssigneeMember = _.findWhere(this.members(), {_id: issue.assignee()});
            if (oldAssigneeMember) {
                oldAssigneeMember.unassign(issue);
            }
        }

        // assign
        issue.assignee(memberId);
        if (member) {
            if (member.assign(issue)) {
                console.error('cannot assign');
                return false;
            }
            issue.stage('todo');
        } else {
            issue.stage('backlog');
        }
    };

    Project.prototype.updateStage = function (issueId, toStage) {
        var issue = _.find(this.issues(), function (x) { return x._id() === issueId; }),
            oldStage, member;

        if (!issue) {
            console.error('issue not found');
            return false;
        }

        // TODO: assignee check if next stage is in todo, doing, done
        member = _.findWhere(this.members(), {_id: issue.assignee()});
        //if (!member) {
        //    console.error('assigned member not found');
        //    return false;
        //}

        oldStage = issue.stage();
        issue.stage(toStage);

        if (member) {
            member[oldStage].remove(issue);
            member[toStage].push(issue);
        }
    };

    // direction true: push, false: unshift
    Project.prototype.addIssue = function (issue, direction) {
        var observableIssue = new Issue(issue);
        // assigneeの名前版
        observableIssue.assigneeUserName = ko.computed(function () {
            var userId = observableIssue.assignee();
            var member = _.find(this.members(), function (x) { return x._id === userId; });
            return member ? member.userName : null;
        }, this);

        this.issues[direction ? 'push' : 'unshift'](observableIssue);

        this.stages[observableIssue.stage()][direction ? 'push' : 'unshift'](observableIssue);
        observableIssue.beforeStage = observableIssue.stage();
        observableIssue.stage.subscribe(function (stage) {
            this.stages[observableIssue.beforeStage].remove(observableIssue);
            this.stages[stage].push(observableIssue);
            this.stages[stage].sort(Issue.sortFunc);
            observableIssue.beforeStage = stage;
        }.bind(this));
    };

    Project.prototype.removeIssue = function (issue) {
        this.issues.remove(issue);
    };

    // direction true: push, false: unshift
    Project.prototype.addMember = function (member, direction) {
        var observableMember = new User(member.user);
        this.members[direction ? 'push' : 'unshift'](observableMember);
    };

    Project.prototype.removeMember = function (member) {
        this.members.remove(member);
    };

    function bindIssuesToMembers(membersObservableArray, issuesObservableArray) {
        var members = membersObservableArray(),
            issues = issuesObservableArray();

        members.forEach(function (member) {
            var userIssues = issues.filter(function (issue) {
                return issue.assignee() && issue.assignee() === member._id;
            });

            stageTypeAssignedKeys.forEach(function (stageName) {
                userIssues.filter(function (issue) {
                    return issue.stage() === stageName;
                }).forEach(function (issue) {
                    member[stageName].push(issue);
                });

                // sort init
                member[stageName].sort(Issue.sortFunc);
                member[stageName].subscribe(function () {
                    member[stageName].peek().sort(Issue.sortFunc);
                });
            });
        });

        // issueの追加、削除と連携
        issuesObservableArray.subscribe(function (changes) {
            changes.forEach(function (change) {
                var issue = change.value,
                    member = _.findWhere(membersObservableArray(), {_id: issue.assignee()});

                if (member) {
                    member[issue.stage()][change.status === 'added' ? 'unshift' : 'remove'](issue);
                }
            });
        }, null, 'arrayChange');
    }

    function createUrl (userName, projectId, projectName) {
        return '/users/' + userName + '/projects/' + projectId + '/' + projectName;
    }

}(_, window.nakazawa.util));