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
        /*** kanban ***/
        o.kanban.on('overWIPLimitDropped', function (arg, member, targetSlaveIssueList) {
            alert.pushAlert({
                title: 'WIPLimitを超えてタスクをアサインできません。',
                message: 'タスクを調整するか、ユーザ設定からWIPLimitの上限を変更してください。',
                isSuccess: false
            });
        });

        o.kanban.on('workingIssueDropped', function (arg, issue) {
            alert.pushAlert({
                title: '作業中タスクのステージや担当者は変更できません。',
                message: '作業状態を「待機中」に変更してから操作しなおしてください。',
                isSuccess: false
            });
        });

        /*** socket ***/
        //o.socket.on('connect', function (err) { });

        o.socket.on('error', function () {
            alert.pushAlert({
                title: 'ソケットが接続できませんでした。',
                isSuccess: false
            })
        });

        o.socket.on('reconnect', function () {
            alert.pushAlert({
                title: 'ソケットを再接続しました。',
                isSuccess: true
            });
        });

        o.socket.on('disconnect', function () {
            alert.pushAlert({
                title: 'ソケットが切断されました。',
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

        /*** socket emit callback ***/
        // socket emit callback は res.status に [success | error | server error] にいずれかを取る
        var status = {success: 'success', error: 'error', serverError: 'server error'};

        o.socket.eventEmitCallback.on('add-member', function (req, res) {
            var errorTitle = 'メンバー[' + req.userName  + ']の追加に失敗しました。';
            if (res.status === status.serverError) { alertServerError(alert, errorTitle, res.message); }
            if (res.status === status.error) { alertUserError(alert, errorTitle, res.message); }
        });

        o.socket.eventEmitCallback.on('remove-member', function (req, res) {
            var errorTitle = 'メンバー[' + req.userName  + ']の削除に失敗しました。';
            if (res.status === status.serverError) { alertServerError(alert, errorTitle, res.message); }
            if (res.status === status.error) { alertUserError(alert, errorTitle, res.message); }
        });

        o.socket.eventEmitCallback.on('update-member', function (req, res) {
            var errorTitle = 'メンバー[' + req.userName  + ']情報の更新に失敗しました。';
            if (res.status === status.serverError) { alertServerError(alert, errorTitle, res.message); }
            if (res.status === status.error) { alertUserError(alert, errorTitle, res.message); }
        });

        o.socket.eventEmitCallback.on('update-member-order', function (req, res) {
            var errorTitle = 'メンバー[' + req.userName  + ']の並び替えに失敗しました。';
            if (res.status === status.serverError) { alertServerError(alert, errorTitle, res.message); }
            if (res.status === status.error) { alertUserError(alert, errorTitle, res.message); }
        });

        o.socket.eventEmitCallback.on('add-issue', function (req, res) {
            var errorTitle = 'タスク[' + req.title  + ']の追加に失敗しました。';
            if (res.status === status.serverError) { alertServerError(alert, errorTitle, res.message); }
            if (res.status === status.error) { alertUserError(alert, errorTitle, res.message); }
        });

        o.socket.eventEmitCallback.on('remove-issue', function (req, res) {
            var issue = o.kanban.project.getIssue(req.issueId);
            var errorTitle = 'タスク[' + issue.title() + ']の削除に失敗しました。';
            if (res.status === status.serverError) { alertServerError(alert, errorTitle, res.message); }
            if (res.status === status.error) { alertUserError(alert, errorTitle, res.message); }
        });

        o.socket.eventEmitCallback.on('update-stage', function (req, res) {
            var issue = o.kanban.project.getIssue(req.issueId);
            var errorTitle = 'タスク[' + issue.title() + ']のステージ、担当者の更新に失敗しました。';
            if (res.status === status.serverError) { alertServerError(alert, errorTitle, res.message); }
            if (res.status === status.error) { alertUserError(alert, errorTitle, res.message); }
        });

        o.socket.eventEmitCallback.on('update-issue-detail', function (req, res) {
            var issue = o.kanban.project.getIssue(req.issueId);
            var errorTitle = 'タスク[' + issue.title() + ']のタイトル、内容の更新に失敗しました。';
            if (res.status === status.serverError) { alertServerError(alert, errorTitle, res.message); }
            if (res.status === status.error) { alertUserError(alert, errorTitle, res.message); }
        });

        o.socket.eventEmitCallback.on('update-issue-priority', function (req, res) {
            var issue = o.kanban.project.getIssue(req.issueId);
            var errorTitle = 'タスク[' + issue.title() + ']の並び替えに失敗しました。';
            if (res.status === status.serverError) { alertServerError(alert, errorTitle, res.message); }
            if (res.status === status.error) { alertUserError(alert, errorTitle, res.message); }
        });
    }

    function alertServerError(alert, title, message) {
        // 多くがユーザエラーがサーバエラーになっているので、サーバエラーと表記したら間違いになる
        alert.pushAlert({
            //title: '[サーバエラー] ' + title,
            title: title,
            //message: 'お手数ですが、管理者にお問い合わせください。 ' + '(' + message + ')',
            message: message,
            isSuccess: false
        });
    }

    function alertUserError(alert, title, message) {
        alert.pushAlert({
            title: title,
            message: message,
            isSuccess: false
        });
    }

}(_, window.nakazawa.util));