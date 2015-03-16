(function (global, $, _, ko, util) {
    'use strict';

    var viewmodel = util.namespace('kpp.viewmodel'),
        model = util.namespace('kpp.model'),
        view = util.namespace('kpp.view'),
        alert = new (util.namespace('util.viewmodel')).Alert(),
        effects = view.effects,
        project = new model.Project(),
        kanban = new viewmodel.Kanban(),
        projectId;

    projectId = getProjectId();
    project.fetch(projectId)
        .then(function () {
            return kanban.init(project);
        })
        .done(function () {
            effects.applyBindings(global);
            ko.applyBindings(alert, $('.alerts')[0]);
            ko.applyBindings(kanban);
        });

    function getProjectId() {
        return _.compact(location.pathname.split('/')).splice(-2, 1)[0];
    }

}(window, jQuery, _, ko, window.nakazawa.util));