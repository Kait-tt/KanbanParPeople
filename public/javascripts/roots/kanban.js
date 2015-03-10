(function ($, _, ko, util) {
    'use strict';

    var viewmodel = util.namespace('kpp.viewmodel'),
        model = util.namespace('kpp.model'),
        stub = util.namespace('kpp.stub'),
        alert = new (util.namespace('util.viewmodel')).Alert(),
        project = new model.Project(),
        issues = stub.issues,
        users = stub.users,
        vm = {
            issues: issues,
            users: users,
            alerts: alert.alerts
        },
        isStub = true;

    if (isStub) {
        vm.users.forEach(function (user) {
            ['todo', 'doing', 'review', 'done'].forEach(function (stage) {
                user[stage] = user[stage].map(function (issueId) {
                    return _.findWhere(issues, {id: issueId});
                });
            });
        });

        ko.applyBindings(vm);
    } else {
        project.fetch()
    }

}(jQuery, _, ko, window.nakazawa.util));