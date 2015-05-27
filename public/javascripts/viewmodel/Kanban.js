(function (ko, io, _, util) {
    'use strict';

    var viewmodel = util.namespace('kpp.viewmodel'),
        model = util.namespace('kpp.model'),
        stageTypeKeys = model.stageTypeKeys;

    viewmodel.Kanban = viewmodel.Kanban || Kanban;

    function Kanban(o) {
        var that = this;

        that.members = null;

        that.issues = null;

        that.project = null;

        // that.stages[name] = 各ステージのIssues
        that.stages = null;

        // 追加するユーザの名前
        that.addMemberUserName = ko.observable();

        // 追加するIssueのタイトル
        that.addIssueTitle = ko.observable();

        // 追加するIssueの説明
        that.addIssueBody = ko.observable();

        // アサイン先のユーザ名
        that.assignUserName = ko.observable();

        // 選択しているIssue
        that.selectedIssue = ko.observable();

        // Issueの更新後のタイトル
        that.updateIssueDetailTitle = ko.observable();

        // Issueの更新後のBody
        that.updateIssueDetailBody = ko.observable();

        that.selectedIssue.subscribe(function (issue) {
            that.updateIssueDetailTitle(issue ? issue.title() : null);
            that.updateIssueDetailBody(issue ? issue.body() : null);
        });

        // 選択しているメンバー
        that.selectedMember = ko.observable();

        // 編集用の仮のWIP制限
        that.settingsWipLimit = ko.observable();

        that.selectedMember.subscribe(function (member) {
            if (member) {
                that.settingsWipLimit(member.wipLimit());
            }
        });

        // アサイン可能なメンバー
        that.canAssignMembers = ko.computed(function () {
            return that.members().filter(function (member) {
                return !member.isWipLimited();
            });
        }, that, {deferEvaluation: true});

        that.init = function (project) {
            that.project = project;
            that.members = project.members;
            that.issues = project.issues;
            that.stages = project.stages;

            initSocket();
            initSocketDebugMode();
        };

        // メンバーを追加する
        that.addMember = function () {
            that.socket.emit('add-member', {userName: that.addMemberUserName()}, function (res) {
                if (res.status === 'success') {
                    // reset form
                    that.addMemberUserName(null);
                }
            });
        };

        // メンバーを削除する
        that.removeMember = function (member) {
            that.socket.emit('remove-member', {userName: member.userName()});
        };

        // メンバー設定を更新する
        that.updateMember = function () {
            var member = that.selectedMember();
            if (!member) {
                console.error('unselected member');
                return;
            }

            that.socket.emit('update-member', {userName: member.userName(), wipLimit: that.settingsWipLimit()});
        };

        // Issueと追加する
        that.addIssue = function () {
            var title = that.addIssueTitle(),
                body = that.addIssueBody();

            that.socket.emit('add-issue', {title: title, body: body}, function (res) {
                if (res.status === 'success') {
                    // reset form
                    that.addIssueTitle(null);
                    that.addIssueBody(null);
                }
            });
        };

        // Issueを削除する
        that.removeIssue = function (issue) {
            that.socket.emit('remove-issue', {issueId: issue._id()}, _.noop);
        };

        // タスクをアサインする
        // ユーザが指定されていない場合はアンアサインする
        that.assignIssue = function () {
            var issue = that.selectedIssue(),
                user = that.project.getMemberByName(that.assignUserName());

            that.socket.emit('assign', {issueId: issue._id(), userId: user ? user._id() : null}, function () {
                // reset form
                that.selectedIssue(null);
                that.assignUserName(null);
            });
        };

        // タスクのステージを一つ次へ移動する
        that.nextStage = function (issue) {
            that.stepStage(issue, 1);
        };

        // タスクのステージを一つ前へ移動する
        that.prevStage = function (issue) {
            that.stepStage(issue, -1);
        };

        // タスクのステージをstep分移動する
        that.stepStage = function (issue, step) {
            var currentStage = issue.stage(),
                toIndex = stageTypeKeys.indexOf(currentStage) + step,
                toStage;

            if (toIndex < 0 || toIndex >= stageTypeKeys.length) {
                console.error('cannot change stage', toIndex);
                return false;
            }

            toStage = stageTypeKeys[toIndex];

            that.updateStage(issue, toStage);
        };

        // タスクのステージを変更する
        that.updateStage = function (issue, toStage) {
            that.socket.emit('update-stage', {issueId: issue._id(), toStage: toStage});
        };

        // タスクのタイトル/説明を更新する
        that.updateIssueDetail = function () {
            var issue = that.selectedIssue();

            if (!issue) {
                console.error('issue is not selected');
                return;
            }

            that.socket.emit('update-issue-detail', {
                issueId: issue._id(),
                title: that.updateIssueDetailTitle(),
                body: that.updateIssueDetailBody()
            }, function (res) {
                if (res.status === 'success') {
                    // reset form
                    that.selectedIssue(null);
                }
            });
        };

        // タスクの優先順位を変更する
        that.updateIssuePriority = function (issue, toPriority) {
            that.socket.emit('update-issue-priority', {issueId: issue._id(), toPriority: toPriority});
        };

        // ソケット通信のイベント設定、デバッグ設定を初期化する
        function initSocket () {
            that.socket = io.connect();

            that.socket.on('connect', function () {
                that.socket.emit('join-project-room', {projectId: that.project.id()});
            });

            that.socket.on('add-member', function (req) {
                that.project.addMember(req.member);
            });

            that.socket.on('remove-member', function (req) {
                var targetMember = that.project.getMember(req.member.user._id);
                that.project.removeMember(targetMember);
            });

            that.socket.on('update-member', function (req) {
                var targetMember = that.project.getMember(req.member.user._id);
                that.project.updateMember(targetMember, req.member);
            });

            that.socket.on('add-issue', function (req) {
                that.project.addIssue(req.issue);
            });

            that.socket.on('remove-issue', function (req) {
                var targetIssue = that.project.getIssue(req.issue._id);
                that.project.removeIssue(targetIssue);
            });

            that.socket.on('assign', function (req) {
                that.project.assignIssue(req.issueId, req.memberId);
            });

            that.socket.on('update-stage', function (req) {
                that.project.updateStage(req.issueId, req.toStage);
            });

            that.socket.on('update-issue-detail', function (req) {
                var targetIssue = that.project.getIssue(req.issue._id);

                ['title', 'body'].forEach(function (key) {
                    targetIssue[key](req.issue[key]);
                });
            });

            that.socket.on('update-issue-priority', function (req) {
                that.project.updateIssuePriority(req.issue._id, req.toPriority);
            });
        }

        // ソケットのデバッグ出力を有効にする
        // on/emit時の内容をコンソールに出力する
        function initSocketDebugMode () {
            var onKeys = ['connect', 'add-member', 'update-member', 'remove-member', 'add-issue', 'remove-issue',
                'assign', 'update-stage', 'update-issue-detail', 'update-issue-priority'];

            // debug on event
            onKeys.forEach(function (key) {
                that.socket.on(key, function(res) {
                    console.log('on: ' + key, res);
                });
            });

            // debug on emit
            (function (f) {
                that.socket.emit = function (key, req, fn) {
                    var callback = function (res) {
                        console.log('callback: ' + key, res);
                        if (fn) {
                            fn.apply(this, arguments);
                        }
                    };

                    console.log('emit: ' + key, req);

                    f.call(that.socket, key, req, callback);
                };
            }(that.socket.emit));
        }
    }

}(ko, io, _, window.nakazawa.util));