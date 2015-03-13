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

        this.members = bindMembers(o.members);
        this.issues = bindIssues(o.issues);
        bindIssuesToMembers(this.members(), this.issues());

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

    function bindIssuesToMembers(members, issues) {
        members.forEach(function (user) {
            var userIssues = issues.filter(function (issue) {
                return issue.assignee && issue.assignee === user._id;
            });

            Issue.stageTypes.forEach(function (stageName) {
                userIssues.filter(function (issue) {
                    return issue.stage === stageName;
                }).forEach(function (issue) {
                    user[issue.stage].push(issue);
                });
            });
        });
    }

    function createUrl (userName, projectId, projectName) {
        return '/users/' + userName + '/projects/' + projectId + '/' + projectName;
    }

}(_, window.nakazawa.util));