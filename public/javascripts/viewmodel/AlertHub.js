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
        });

        //o.socket.on('connect', function (err) { });

        o.socket.on('reconnect', function () {
            alert.pushAlert({
                title: 'ソケットを再接続しました。',
                isSuccess: true
            });
        });

        o.socket.on('disconnect', function () {
            alert.pushAlert({
                title: 'ソケットが切断されました。',
                message: '',
                isSuccess: false
            });
        });

        o.socket.on('reconnect_error', function (err) {
            alert.pushAlert({
                title: 'ソケットを再接続しています。',
                message: 'しばらくお待ちください。このメッセージが何度も表示される場合は、' +
                'ページの更新やネットワークの見直しを行ってください。それでも改善されない場合は、' +
                'お手数ですが管理者へお問い合わせください。',
                isSuccess: false
            });
        });
    }

}(_, window.nakazawa.util));