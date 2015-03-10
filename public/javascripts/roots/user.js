(function (global, $, _, ko, util) {
    'use strict';

    var viewmodel = util.namespace('kpp.viewmodel'),
        model = util.namespace('kpp.model'),
        alert = new (util.namespace('util.viewmodel')).Alert(),
        projects = new model.Projects(),
        vm = {
            importProject: new viewmodel.ImportProject({
                projects: projects
            }),
            alerts: alert.alerts,
            projects: projects.items
        };

    window.vm = vm;

    vm.importProject.submit = alert.wrapDeferred(vm.importProject.submit,
        'ProjectのImportに成功しました',
        'ProjectのImportに失敗しました');

    projects.fetch()
        .done(function () {
            ko.applyBindings(vm);
        });



}(window, jQuery, _, ko, window.nakazawa.util));