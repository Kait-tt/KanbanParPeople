(function (global, $, _, ko, util) {
    'use strict';

    var stub = util.namespace('kpp.stub'),
        issues = stub.issues,
        vm = {
            issues: issues
        };

    ko.applyBindings(vm);
}(window, jQuery, _, ko, window.nakazawa.util));