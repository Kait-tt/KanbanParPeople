(function (EventEmitter, ko, io, _, util, global) {
    'use strict';

    var viewmodel = util.namespace('kpp.viewmodel'),
        model = util.namespace('kpp.model'),
        module = util.namespace('kpp.module'),
        stageTypeKeys = model.stageTypeKeys,
        stages = model.stageTypes,
        DraggableIssueList = viewmodel.DraggableIssueList,
        defaultCost = model.Issue.defaultCost,
        localStorage = module.localStorage.load();

    viewmodel.Kanban = viewmodel.Kanban || Kanban;

    /**
     * カンバンのViewModel
     *
     *  Events:
     *      overWIPLimitDropped(arg, member, targetSlaveIssueList): WIPリミットを超えてD&Dした (argはknockout-sortable.beforeMoveイベント引数のarg）
     *
     * @param o
     * @constructor
     */
    function Kanban(o) {
        EventEmitter.call(this, o);

        var that = this;

        that.socket = o.socket;

        that.joinedMembers = ko.observableArray();

        that.chatTexts = ko.observableArray();

        that.searchQuery = ko.observable();

        that.viewMode = ko.observable(localStorage.getItem('viewMode')); // "full" or "compact"
        that.viewMode.subscribe(function (val) { // localStorageに保存
            localStorage.setItem('viewMode', val);
        });

        that.members = null;

        that.issues = null;

        that.labels = null;

        that.project = null;

        that.stats = null;

        // that.stages[name] = 各ステージのIssues
        that.stages = null;

        // that.draggableList[stage] = DraggableIssueList
        // that.draggableList[stage][UserID] = DraggableIssueList
        that.draggableList = {};

        // 追加するユーザの名前
        that.addMemberUserName = ko.observable();

        // 追加するIssueのタイトル
        that.addIssueTitle = ko.observable();

        // 追加するIssueの説明
        that.addIssueBody = ko.observable();

        // 追加するIssueのステージ
        that.addIssueStage = ko.observable('issue');

        // 追加するIssueのコスト
        that.addIssueCost = ko.observable();

        // 追加するIssueのLabels
        that.addIssueLabels = ko.observableArray();

        // アサイン先のユーザ名
        that.assignUserName = ko.observable();

        // 選択しているIssue
        that.selectedIssue = ko.observable();

        // Issueの更新後のタイトル
        that.updateIssueDetailTitle = ko.observable();

        // Issueの更新後のBody
        that.updateIssueDetailBody = ko.observable();

        // Issueの更新後のLabels
        that.updateIssueDetailLabels = ko.observableArray();

        // Issueの更新後のCost
        that.updateIssueDetailCost = ko.observable();

        // Issueの更新後の作業状態(isWorking)
        that.updateIssueDetailIsWorking = ko.observable(false);

        // IssueDetail WorkingHistoryの表示mode ('edit' or 'view')
        that.issueDetailWorkHistoryMode = ko.observable('view');

        // Issueの更新後のWorkHistory
        that.updateIssueDetailWorkHistory = ko.observableArray();

        that.selectedIssue.subscribe(function (issue) {
            that.updateIssueDetailTitle(issue ? issue.title() : null);
            that.updateIssueDetailBody(issue ? issue.body() : null);
            that.updateIssueDetailLabels(issue ? _.clone(issue.labels()) : []);
            var cost = issue ? issue.cost() : 0;
            that.updateIssueDetailCost(String(cost ? cost : 0));
            that.updateIssueDetailIsWorking(issue ? issue.isWorking() : false);
            that.issueDetailWorkHistoryMode('view');
            that.updateIssueDetailWorkHistory.removeAll();
        });

        // 選択しているメンバー
        that.selectedMember = ko.observable();

        // ログインユーザ
        that.loginMember = ko.computed(function () {
            var username = global.username;
            return _.find(that.members(), function (member) {
                return member.userName() === username;
            });
        }, that, {deferEvaluation: true});

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
            that.labels = project.labels;
            that.stages = project.stages;
            that.stats = new model.ProjectStats({project: project});
            that.initDraggableIssueList();

            initSocket(that.socket);
        };

        // 各ステージ、各メンバー毎にDraggableIssueListを作る
        // メンバーの追加を監視する
        that.initDraggableIssueList = function () {
            that.draggableList = {};
            var _params = {
                masterIssues: that.issues,
                onUpdatedStage: that.updateStage,
                onUpdatedPriority: that.updateIssuePriority
            };

            _.values(stages).forEach(function (stage) {
                var params = _.extend(_.clone(_params), {stage: stage.name, assignee: null}),
                    list;

                if (stage.assigned) {
                    list = {};
                    that.members().forEach(function (member) {
                        list[member._id()] = new DraggableIssueList(_.extend(_.clone(params), {assignee: member._id()}));
                    });
                    that.members.subscribe(function (changes) {
                        _.chain(changes)
                            .where({status: 'added'})
                            .pluck('value')
                            .filter(function (member) { return !list[member._id()]; })
                            .forEach(function (member) {
                                list[member._id()] = new DraggableIssueList(_.extend(_.clone(params), {assignee: member._id()}));
                            })
                            .value(); // value method is exec
                    }, this, 'arrayChange');
                } else {
                    list = new DraggableIssueList(params);
                }

                that.draggableList[stage.name] = list;
            });
        };

        // ドラッグ時にWIP制限を超過するようならばキャンセルする
        // ドラッグ時に作業中ならキャンセルする
        that.onBeforeMoveDrag = function (arg) {
            var list = arg.targetParent.parent,
                issue = arg.item,
                member;

            if (!(list instanceof DraggableIssueList)) { return; }

            // 作業中チェック
            if (issue.isWorking()) {
                arg.cancelDrop = true;
                that.emit('workingIssueDropped', arg, issue);
            }

            // WIPLimitチェック
            if (!list.assignee || issue.assignee() === list.assignee) { return; }

            member = that.project.getMember(list.assignee);
            if (!member) { throw new Error('dragged target member is not found: ' + list.assignee); }

            var cost = issue.cost();
            if (member.willBeOverWipLimit(cost ? cost : defaultCost)) {
                arg.cancelDrop = true;
                that.emit('overWIPLimitDropped', arg, member, list);
            }
        };

        // 検索する
        that.searchIssue = function (searchQuery) {
            if (!_.isString(searchQuery)) { searchQuery = ''; }
            searchQuery = searchQuery.trim();

            if (searchQuery) { // search
                var queries = util.splitSearchQuery(searchQuery);
                that.issues().forEach(function (issue) {
                    var text = issue.alltext();
                    issue.visible(queries.every(function (q) { return text.indexOf(q) !== -1; }));
                });
                
            } else { // all visible
                that.issues().forEach(function (issue) {
                    issue.visible(true);
                });
            }
        };

        // 検索クエリの値が変わったら検索を実行する
        that.searchQuery.subscribe(_.debounce(that.searchIssue, 500));

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
        that.removeMember = function () {
            var member = that.selectedMember();
            if (!member) {
                console.error('unselected member');
                return;
            }

            that.socket.emit('remove-member', {userName: member.userName()}, function (res) {
                if (res.status === 'success') {
                    // モーダルを閉じる
                    $('.modal').modal('hide');
                }
            });
        };

        // メンバー設定を更新する
        that.updateMemberWipLimit = function () {
            var member = that.selectedMember();
            if (!member) { return console.error('unselected member'); }

            that.socket.emit('update-member', {userName: member.userName(), wipLimit: that.settingsWipLimit()});
        };

        that.updateMemberOrderUp = function (member) {
            var members = that.members();
            var idx = members.indexOf(member);
            if (idx === 0) { return console.log(member.userName() + ' is already top'); }
            that.updateMemberOrder(member, members[idx - 1]);
        };

        that.updateMemberOrderDown = function (member) {
            var members = that.members();
            var idx = members.indexOf(member);
            if (idx === members.length - 1) { return console.log(member.userName() + ' is already bottom'); }
            that.updateMemberOrder(member, (idx + 2) === members.length ? null : members[idx + 2]);
        };

        // タスクの優先順位を変更する
        that.updateMemberOrder = function (member, insertBeforeOfMember) {
            var insertBeforeOfUserName =  insertBeforeOfMember ? insertBeforeOfMember.userName() : null;
            that.socket.emit('update-member-order', {userName: member.userName(), insertBeforeOfUserName: insertBeforeOfUserName});
        };

        // Issueと追加する
        that.addIssue = function () {
            var title = that.addIssueTitle(),
                body = that.addIssueBody(),
                stage = that.addIssueStage(),
                cost = that.addIssueCost(),
                labels = that.addIssueLabels().map(function (x) { return x.name(); });
            
            that.socket.emit('add-issue', {title: title, body: body,
                stage: stage, cost: cost, labels: labels});
        };

        // Issueを削除する (archive)
        that.removeIssue = function (issue) {
            that.socket.emit('remove-issue', {issueId: issue._id()}, _.noop);
        };

        // Issueを削除する (archive)
        that.removeIssueWithSelected = function () {
            console.log(that.selectedIssue());
            that.removeIssue(that.selectedIssue());
        };

        // タスクをアサインする
        // ユーザが指定されていない場合はアンアサインする
        that.assignIssue = function () {
            var issue = that.selectedIssue(),
                user = that.project.getMemberByName(that.assignUserName());

            if (!issue) { throw new Error('issue is not selected.'); }

            that.socket.emit('update-stage', {
                issueId: issue._id(),
                userId: user ? user._id() : null,
                toStage: user ? stages.todo.name : stages.backlog.name
            }, function () {
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

            if (!_.inRange(toIndex, 0, stageTypeKeys.length)) {
                throw new Error('cannot change stage: ' +  toIndex);
            }

            toStage = stageTypeKeys[toIndex];

            // check assign
            // 担当者が必要なステージから必要ないステージへ移行した際には
            // 担当者を外す
            var currentStageDetail = stages[currentStage];
            var toStageDetail = stages[toStage];
            var assign = undefined;
            if (currentStageDetail.assigned && !toStageDetail.assigned) {
                assign = null; // unassign
            }

            that.updateStage(issue, toStage, assign);
        };

        // タスクのステージを変更する
        that.updateStage = function (issue, toStage, /* option */userId) {
            that.socket.emit('update-stage', {issueId: issue._id(), toStage: toStage, userId: userId !== undefined ? userId : issue.assignee()});
        };

        // タスクのタイトル/説明/ラベルリストを更新する
        that.updateIssueDetail = function () {
            var issue = that.selectedIssue();
            if (!issue) { throw new Error('issue is not selected'); }

            that.updateIssueLabels();
            that.updateIssueIsWorking();

            that.socket.emit('update-issue-detail', {
                issueId: issue._id(),
                title: that.updateIssueDetailTitle(),
                body: that.updateIssueDetailBody(),
                cost: Number(that.updateIssueDetailCost())
            }, function (res) {
                if (res.status === 'success') {
                    // reset form
                    that.selectedIssue(null);
                }
            });
        };

        that.canUpdateIssueDetail = function () {
            return !that.updateIssueWillBeOverWipLimit();
        };

        that.updateIssueWillBeOverWipLimit = function () {
            var issue = that.selectedIssue();
            if (!issue) { return false; }
            var toMember = issue.assigneeMember();
            if (!toMember) { return false; }
            var curCost = Number(issue.cost());
            var newCost = Number(that.updateIssueDetailCost());
            var curCost2 = curCost ? curCost : defaultCost;
            var newCost2 = newCost ? newCost : defaultCost;
            return toMember.willBeOverWipLimit(newCost2 - curCost2);
        };

        that.updateIssueIsWorking = function () {
            var issue = that.selectedIssue();
            var curIsWorking = issue.isWorking();
            var newIsWorking = that.updateIssueDetailIsWorking();

            if (curIsWorking !== newIsWorking) {
                that.socket.emit('update-issue-working-state', {
                    issueId: issue._id(),
                    isWorking: newIsWorking
                }, _.noop());
            }
        };

        that.updateIssueLabels = function () {
            var issue = that.selectedIssue();
            var curLabels = issue.labels();
            var newLabels = that.updateIssueDetailLabels();
            var adds = newLabels.filter(function (x) { return !_.includes(curLabels, x); });
            var removes = curLabels.filter(function (x) { return !_.includes(newLabels, x); });

            if (that.issueDetailWorkHistoryMode() === 'edit') {
                that.onClickWorkHistorySave();
            }

            adds.forEach(function (label) {
                that.socket.emit('attach-label', {
                    issueId: issue._id(),
                    labelName: label.name()
                }, _.noop);
            });

            removes.forEach(function (label) {
                that.socket.emit('detach-label', {
                    issueId: issue._id(),
                    labelName: label.name()
                }, _.noop);
            });
        };

        // タスクの優先順位を変更する
        that.updateIssuePriority = function (issue, insertBeforeOfIssue) {
            var insertBeforeOfIssueId =  insertBeforeOfIssue ? insertBeforeOfIssue._id() : null;
            that.socket.emit('update-issue-priority', {issueId: issue._id(), insertBeforeOfIssueId: insertBeforeOfIssueId});
        };

        // events
        that.onClickIssueDetail = function (issue, e) {
            that.selectedIssue(issue);
            var $ele = $(e.target.parentElement);
            if ($ele.attr('data-toggle') !== 'modal') {
                $ele = $ele.parents('li[data-toggle=modal]');
            }
            $($ele.attr('data-target')).modal('show');
            return util.cancelBubble(e);
        };

        that.onClickIssueNextStage = function (issue, e) {
            that.nextStage(issue);
            return util.cancelBubble(e);
        };

        that.onClickIssuePrevStage = function (issue, e) {
            that.prevStage(issue);
            return util.cancelBubble(e);
        };

        that.onClickIssueArchive = function (issue, e) {
            that.selectedIssue(issue);
            var $ele = $(e.target.parentElement);
            if ($ele.attr('data-toggle') !== 'modal') {
                $ele = $ele.parents('li[data-toggle=modal]');
            }
            $($ele.attr('data-target')).modal('show');
            return util.cancelBubble(e);
        };

        that.onClickIssueAssign = function (issue, e) {
            that.selectedIssue(issue);
            var $ele = $(e.target.parentElement);
            if ($ele.attr('data-toggle') !== 'modal') {
                $ele = $ele.parents('li[data-toggle=modal]');
            }
            $($ele.attr('data-target')).modal('show');
            return util.cancelBubble(e);
        };

        that.onClickDeleteMember = function () {
            $('*').modal('hide');
            return true;
        };

        that.onClickStartToWork = function (issue) {
            that.socket.emit('update-issue-working-state', {
                issueId: issue._id(),
                isWorking: true
            }, _.noop());
        };

        that.onClickStopToWork = function (issue) {
            that.socket.emit('update-issue-working-state', {
                issueId: issue._id(),
                isWorking: false
            }, _.noop());
        };

        that.onClickToggleWorkOnCard = function (issue, e) {
            that.socket.emit('update-issue-working-state', {
                issueId: issue._id(),
                isWorking: !issue.isWorking()
            }, _.noop());
            util.cancelBubble(e);
            return false;
        };

        that.onClickMemberVisibleCheckBox = function (member) {
            that.socket.emit('update-member', {userName: member.userName(), visible: member.visible()});
            return true;
        };
        
        that.archiveAllIssues = function () {
            that.draggableList.done.issues().forEach(function (issue) {
                that.removeIssue(issue);
            });
        };

        that.addChatText = function (chat) {
            var time = moment(chat.created_at).format('MM/DD HH:mm:ss');
            that.chatTexts.push('[' + time + '] (' + chat.sender + ') ' + chat.content);
        };
        
        that.onClickWorkHistoryEditMode = function () {
            that.updateIssueDetailWorkHistory(that.selectedIssue().workHistory().map(model.Work.clone));
            that.issueDetailWorkHistoryMode('edit');
        };
        
        that.onClickWorkHistorySave = function () {
            var issue = that.selectedIssue();
            if (!issue) { return console.error('issue is not selected.'); }

            if (!that.canClickWorkHistorySave()) { return console.error('invalid work history.'); }

            var workHistory = that.updateIssueDetailWorkHistory().map(function (x) { return x.toMinimumObject(); });
            issue.updateWorkHistory(workHistory);

            that.socket.emit('update-issue-work-history', {issueId: issue._id(), workHistory: workHistory});
            
            that.issueDetailWorkHistoryMode('view');
        };

        that.canClickWorkHistorySave = ko.computed(function () {
            return that.updateIssueDetailWorkHistory().every(function (work) {
               return work.isValidStartTime() && work.isValidEndTime() && work.isValidUserId();
            });
        });

        that.onClickWorkHistoryCancel = function () {
            that.updateIssueDetailWorkHistory.removeAll();
            that.issueDetailWorkHistoryMode('view');
        };

        that.onClickAddWork = function (issue) {
            console.log(issue.assigneeMember());
            that.updateIssueDetailWorkHistory.push(new model.Work({
                members: that.members,
                startTime: new Date(),
                endTime: new Date(),
                userId: issue.assigneeMember() ? issue.assigneeMember()._id() : null,
                isEnded: true
            }));
        };

        that.onClickRemoveWork = function (work) {
            that.updateIssueDetailWorkHistory.remove(work);
        };
        
        // ソケット通信のイベント設定、デバッグ設定を初期化する
        function initSocket (socket) {
            socket.on('connect', function (req) {
                socket.emit('join-project-room', {projectId: that.project.id()});
            });

            socket.on('init-joined-users', function (req) {
                var usernames = req.joinedUserNames;
                var members = _.compact(usernames.map(function (username) {
                    return that.project.getMemberByName(username);
                }));
                that.joinedMembers(members);
            });

            socket.on('join-room', function (req) {
                var member = that.project.getMemberByName(req.username);
                if (member) { // ユニーク処理はしない
                    that.joinedMembers.push(member);
                }
            });

            socket.on('leave-room', function (req) {
                var member = that.project.getMemberByName(req.username);
                if (member) {
                    var pos = that.joinedMembers().indexOf(member);
                    if (pos !== -1) {
                        that.joinedMembers.splice(pos, 1);
                    }
                }
            });

            socket.on('add-member', function (req) {
                that.project.addMember(req.member, {reverse: true});
            });

            socket.on('remove-member', function (req) {
                var targetMember = that.project.getMember(req.member.user._id);
                that.project.removeMember(targetMember);
            });

            socket.on('update-member', function (req) {
                var targetMember = that.project.getMember(req.member.user._id);
                that.project.updateMember(targetMember, req.member);
            });

            socket.on('update-member-order', function (req) {
                that.project.updateMemberOrder(req.userName, req.insertBeforeOfUserName);
            });

            socket.on('add-issue', function (req) {
                that.project.addIssue(req.issue);
            });

            socket.on('remove-issue', function (req) {
                var targetIssue = that.project.getIssue(req.issue._id);
                that.project.removeIssue(targetIssue);
            });

            socket.on('update-stage', function (req) {
                that.project.updateStage(req.issueId, req.toStage, req.assignee);
            });

            socket.on('update-issue-detail', function (req) {
                var targetIssue = that.project.getIssue(req.issue._id);

                ['title', 'body', 'cost'].forEach(function (key) {
                    targetIssue[key](req.issue[key]);
                });
            });

            socket.on('update-issue-working-state', function (req) {
                that.project.updateIssueWorkingState(req.issue._id, req.isWorking, req.issue.workHistory);
            });
            
            socket.on('update-issue-work-history', function (req) {
                that.project.updateIssueWorkHistory(req.issue._id, req.workHistory);
            });
            
            socket.on('update-issue-priority', function (req) {
                that.project.updateIssuePriority(req.issue._id, req.insertBeforeOfIssueId);
            });

            socket.on('attach-label', function (req) {
                if (req.issue && req.label) {
                    that.project.attachLabel(req.issue._id, that.project.getLabelByName(req.label.name)._id());
                }
            });

            socket.on('detach-label', function (req) {
                if (req.issue && req.label) {
                    that.project.detachLabel(req.issue._id, that.project.getLabelByName(req.label.name)._id());
                }
            });

            socket.on('sync-label-all', function (req) {
                that.project.replaceLabelAll(req.labels, req.issues);
            });

            socket.on('chat', function (req) {
                that.addChatText(req);
            });

            socket.on('chat-history', function (req) {
                req.forEach(function (chat) {
                    that.addChatText(chat);
                });
                that.chatTexts.push('--------------------'); // 区切りバー
            });
            
            socket.initSocketDebugMode();

            if (socket.connected) {
                socket.emit('join-project-room', {projectId: that.project.id()});
            }
        }
    }

    util.inherits(Kanban, EventEmitter);

}(EventEmitter2, ko, io, _, window.nakazawa.util, window));