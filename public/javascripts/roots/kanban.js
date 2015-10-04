(function (global, $, _, ko, util) {
    'use strict';

    var viewmodel = util.namespace('kpp.viewmodel'),
        model = util.namespace('kpp.model'),
        view = util.namespace('kpp.view'),
        alert = new (util.namespace('util.viewmodel')).Alert(),
        effects = view.effects,
        scroller = new view.Scroller({
            selectors: ['body', '.main', '.stage-block'],
            cancelSelectors: ['.card']
        }),
        socket = new model.Socket(),
        project = new model.Project(),
        kanban = new viewmodel.Kanban({socket: socket}),
        MiniMenu = view.MiniMenu,
        alertHub = new viewmodel.AlertHub(alert, {kanban: kanban, socket: socket}),
        vm = {},
        chainHideMembersWithURL,
        projectId;

    vm = kanban;
    vm.alerts = alert.alerts;

    // knockout sortable option
    ko.bindingHandlers.sortable.options.scroll = false;
    ko.bindingHandlers.sortable.beforeMove = kanban.onBeforeMoveDrag;

    // test
    window.vm = vm;

    projectId = getProjectId();
    project.fetch(projectId)
        .then(function () {
            return kanban.init(project);
        })
        .done(function () {
            effects.applyBindings(global);
            MiniMenu.applyBindings(global, {onInitialized: initMinimenuTooltip});
            MiniMenu.init(null, {onInitialized: initMinimenuTooltip});
            ko.applyBindings(vm);
            $('.switch').bootstrapSwitch()
                .on('switchChange.bootstrapSwitch', function (e, state) {
                    // checkboxとgithub.syncを同期
                    project.github().sync(state);
                });
            chainHideMembersWithURL = new viewmodel.ChainHideMembersWithURL(project);
        });

    function initMinimenuTooltip($dom, $ul, $li, context) {
        $li.children('[data-toggle="tooltip"]').tooltip({delay: { 'show': 200, 'hide': 100 }});
        $li.children('[data-toggle2="tooltip"]').tooltip({delay: { 'show': 200, 'hide': 100 }});
    }

    function getProjectId() {
        return _.compact(location.pathname.split('/')).splice(-2, 1)[0];
    }

}(window, jQuery, _, ko, window.nakazawa.util));
