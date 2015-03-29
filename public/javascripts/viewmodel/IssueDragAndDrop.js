(function (ko, io, util) {
    'use strict';

    var ns = util.namespace('kpp.viewmodel'),
        model = util.namespace('kpp.model'),
        Issue = model.Issue,
        stageTypes = Issue.stageTypes;

    ns.IssueDragAndDrop = ns.IssueDragAndDrop || IssueDragAndDrop;

    function IssueDragAndDrop(kanban) {
        var that = this;

        that.kanban = kanban;

        that.draggingIssue = ko.observable();

        that.ondragstart = function (issue) {
            that.draggingIssue(issue);
            return true;
        };

        that.ondragover = function (data, event) {
            event.preventDefault();
            return true;
        };

        that.ondrop = function (member, stage, event) {
            if (!~stageTypes.indexOf(stage)) {
                stage = 'issue';
            }

            event.preventDefault();
            var issue = that.draggingIssue();

            that.dropSuccess(member, stage, issue);

            return true;
        };

        that.dropSuccess = function (member, stage, issue) {
            // if same member, change stage
            // else assign

            var currentAssignId = issue.assignee();
            var nextAssignId = member ? member._id : null;
            var nextAssignUserName = member ? member.userName : null;

            if (currentAssignId !== nextAssignId) {
                that.kanban.selectedIssue(issue);
                that.kanban.assignUserName(nextAssignUserName);
                that.kanban.assignIssue();
                // stage is auto changed to 'todo'
            } else {
                var currentStage = issue.stage();
                var nextStage = stage;

                if (currentStage !== nextStage) {
                    that.kanban.updateStage(issue, nextStage);
                }
            }
        };
    }

}(ko, io, window.nakazawa.util));