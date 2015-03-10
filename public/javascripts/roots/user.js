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
            projects: projects.items,
            removeProject: null,
            selectedProject: ko.observable()
        };

    vm.importProject.submit = alert.wrapDeferred(vm.importProject.submit,
        'ProjectのImportに成功しました',
        'ProjectのImportに失敗しました');

    vm.removeProject = alert.wrapDeferred(removeProject,
        'Projectの削除に成功しました',
        'Projectの削除に失敗しました');

    projects.fetch()
        .done(function () {
            ko.applyBindings(vm);
        });

    function removeProject() {
        var project = vm.selectedProject();
        return project.remove()
            .then(function () {
                projects.items.remove(project);
            });
    }

}(window, jQuery, _, ko, window.nakazawa.util));