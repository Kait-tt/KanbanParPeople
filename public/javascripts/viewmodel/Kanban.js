(function (ko, util) {
    'use strict';

    var ns = util.namespace('kpp.viewmodel'),
        model = util.namespace('kpp.model'),
        User = model.User,
        Issue = model.Issue;

    ns.Kanban = ns.Kanban || Kanban;

    function Kanban(o) {
        var that = this;

        that.users = ko.observableArray();

        that.issues = ko.observableArray();

        that.init = function (project) {
            bindUsers(project.members);
            bindIssues(project.issues);
            bindIssuesToMembers(that.users(), that.issues());
        };

        function bindUsers (members) {
            members.forEach(function (member) {
                var user = new User(member.user);
                that.users.push(user);
            });
        }

        function bindIssues (issues) {
            issues.map(function (issue) {
                return new Issue(issue);
            }).forEach(function (issue) {
                that.issues.push(issue);
            });
        }

        function bindIssuesToMembers(users, issues) {
            users.forEach(function (user) {
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
    }

}(ko, window.nakazawa.util));