(function (_, util) {
    'use strict';

    var viewmodel = util.namespace('kpp.viewmodel'),
        defaultOptions = {
        };

    viewmodel.AlertHub = viewmodel.AlertHub || AlertHub;

    /**
     * Alertイベントの制御
     *
     * @constructor
     */
    function AlertHub(alert, o) {
        o.kanban.on('overWIPLimitDropped', function (arg, member, targetSlaveIssueList) {
            alert.pushAlert({
                title: 'WIPLimitを超えてタスクをアサインできません。',
                message: 'タスクを調整するか、ユーザ設定からWIPLimitの上限を変更してください。',
                isSuccess: false
            });
            console.log("alert");
        });
    }

}(_, window.nakazawa.util));