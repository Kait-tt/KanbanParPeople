(function (global, $, _, ko, util) {
    'use strict';

    var stub = util.namespace('kpp.stub'),
        issues = stub.issues,
        users = stub.users,
        vm = {
            issues: issues,
            users: users
        };

    vm.users.forEach(function (user) {
        ['todo', 'doing', 'review', 'done'].forEach(function (stage) {
            user[stage] = user[stage].map(function (issueId) {
                return _.findWhere(issues, {id: issueId});
            });
        });
    });

    ko.applyBindings(vm);

}(window, jQuery, _, ko, window.nakazawa.util));