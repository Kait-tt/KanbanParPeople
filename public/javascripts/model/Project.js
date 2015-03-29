(function (_, util) {
    'use strict';

    var ns = util.namespace('kpp.model'),
        User = ns.User,
        Issue = ns.Issue,
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

        this.noAssignedIssues = ko.observableArray();
        this.members = bindMembers(o.members);
        this.issues = bindIssues(o.issues);
        bindIssuesToMembers(this.members, this.issues, this.noAssignedIssues);

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
        var issue = _.find(this.issues(), function (x) { return x._id() === issueId }),
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
                issue.stage('issue');
            }
        } else {
            this.noAssignedIssues.remove(issue);
        }

        // assign
        issue.assignee(memberId);
        issue.stage('todo');
        if (member) {
            if (member.assign(issue)) {
                console.error('cannot assign');
                return false;
            }
        } else {
            this.noAssignedIssues.push(issue);
            this.noAssignedIssues.sort(function (a, b) { return a._id() == b._id() ? 0 : (a._id() < b._id() ? -1 : 1) })
        }
    };

    Project.prototype.addIssue = function (issue) {
        this.issues.unshift(issue);
    };

    Project.prototype.removeIssue = function (issue) {
        this.issues.remove(issue);
    };

    Project.prototype.addMember = function (user) {
        this.members.unshift(user);
    };

    Project.prototype.removeMember = function (member) {
        this.members.remove(member);
    };

    function bindMembers (members) {
        members = members || [];
        return ko.observableArray(members.map(function (member) {
            return new User(member.user);
        }));
    }

    function bindIssues (issues) {
        issues = issues || [];
        return ko.observableArray(issues.map(function (issue) {
            return new Issue(issue);
        }));
    }

    function bindIssuesToMembers(membersObservableArray, issuesObservableArray, noAssignedIssues) {
        var members = membersObservableArray(),
            issues = issuesObservableArray();

        members.forEach(function (user) {
            var userIssues = issues.filter(function (issue) {
                return issue.assignee() && issue.assignee() === user._id;
            });

            Issue.stageTypes.forEach(function (stageName) {
                userIssues.filter(function (issue) {
                    return issue.stage() === stageName;
                }).forEach(function (issue) {
                    user[issue.stage()].push(issue);
                });
            });
        });

        issues.filter(function (issue) {
            return !issue.assignee() && issue.stage() === 'issue';
        }).forEach(function (issue) {
            noAssignedIssues.push(issue);
        });

        // issueの追加、削除と連携
        issuesObservableArray.subscribe(function (changes) {
            changes.forEach(function (change) {
                var issue = change.value,
                    member = _.findWhere(membersObservableArray(), {_id: issue.assignee()});

                if (change.status === 'added') {
                    if (member) {
                        member[issue.stage()].unshift(issue);
                    } else {
                        noAssignedIssues.push(issue);
                    }
                } else if (change.status === 'deleted') {
                    if (member) {
                        member[issue.stage()].remove(issue);
                    } else {
                        noAssignedIssues.remove(issue);
                    }
                }
            });
        }, null, 'arrayChange');
    }

    function createUrl (userName, projectId, projectName) {
        return '/users/' + userName + '/projects/' + projectId + '/' + projectName;
    }

}(_, window.nakazawa.util));