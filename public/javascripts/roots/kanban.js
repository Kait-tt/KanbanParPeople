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
        project = new model.Project(),
        kanban = new viewmodel.Kanban(),
        MiniMenu = view.MiniMenu,
        issueDragAndDrop = new viewmodel.IssueDragAndDrop(kanban),
        vm = {},
        chainHideMembersWithURL,
        projectId;

    vm = kanban;
    vm.dragAndDrop = issueDragAndDrop;

    // test
    window.vm = vm;

    vm.viewEachAllIssues = ko.observable(null);
    vm.decideViewEachAllIssues = function (member, stage) {
        if (!member) {
            vm.viewEachAllIssues(null);
            $('body').removeClass('modal-open');
        } else {
            vm.viewEachAllIssues({
                member: member,
                stage: stage,
                issues: member[stage]
            });
            $('body').addClass('modal-open');
        }
    };

    projectId = getProjectId();
    project.fetch(projectId)
        .then(function () {
            return kanban.init(project);
        })
        .done(function () {
            effects.applyBindings(global);
            MiniMenu.applyBindings(global);
            MiniMenu.init();
            ko.applyBindings(alert, $('.alerts')[0]);
            ko.applyBindings(vm);
            $('.switch').bootstrapSwitch()
                .on('switchChange.bootstrapSwitch', function (e, state) {
                    // checkboxとgithub.syncを同期
                    project.github().sync(state);
                });
            chainHideMembersWithURL = new viewmodel.ChainHideMembersWithURL(project);
        });

    function getProjectId() {
        return _.compact(location.pathname.split('/')).splice(-2, 1)[0];
    }

}(window, jQuery, _, ko, window.nakazawa.util));