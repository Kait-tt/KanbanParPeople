(function (global, $, _, ko, util) {
    'use strict';

    var alert = new (util.namespace('util.viewmodel').Alert)(),
        vm = {
            importProject: new (util.namespace('kpp.viewmodel').ImportProject)(),
            alerts: alert.alerts
        };

    vm.importProject.submit = alert.wrapDeferred(vm.importProject.submit,
        'ProjectのImportに成功しました',
        'ProjectのImportに失敗しました');

    ko.applyBindings(vm);

}(window, jQuery, _, ko, window.nakazawa.util));