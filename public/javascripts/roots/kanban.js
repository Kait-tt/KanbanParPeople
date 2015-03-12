(function (global, $, _, ko, util) {
    'use strict';

    var viewmodel = util.namespace('kpp.viewmodel'),
        model = util.namespace('kpp.model'),
        stub = util.namespace('kpp.stub'),
        view = util.namespace('kpp.view'),
        alert = new (util.namespace('util.viewmodel')).Alert(),
        effects = view.effects,
        User = model.User,
        Issue = model.Issue,
        project = new model.Project(),
        vm = {
            issues: ko.observableArray(),
            users: ko.observableArray(),
            alerts: alert.alerts
        },
        isStub = false,
        projectId;

    if (isStub) {
        vm.issues = stub.issues;
        vm.users = stub.issues;

        vm.users.forEach(function (user) {
            ['todo', 'doing', 'review', 'done'].forEach(function (stage) {
                user[stage] = user[stage].map(function (issueId) {
                    return _.findWhere(vm.issues, {id: issueId});
                });
            });
        });

        ko.applyBindings(vm);
    } else {
        projectId = getProjectId();
        project.fetch(projectId)
            .done(function () {
                // create user
                project.members.map(function (member) {
                    return new User(member.user);
                }).forEach(function (user) {
                    vm.users.push(user);
                });

                // create issues
                project.issues.map(function (issue) {
                    return new Issue(issue);
                }).forEach(function (issue) {
                    vm.issues.push(issue);
                });

                // bind issue to member
                vm.users().forEach(function (user) {
                    var userIssues = vm.issues().filter(function (issue) {
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

                // done
                effects.applyBindings(global);
                ko.applyBindings(vm);
            });
    }

    function getProjectId() {
        return _.compact(location.pathname.split('/')).splice(-2, 1)[0];
    }

}(window, jQuery, _, ko, window.nakazawa.util));