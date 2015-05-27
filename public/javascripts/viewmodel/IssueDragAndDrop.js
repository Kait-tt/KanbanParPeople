(function (ko, util) {
    'use strict';

    var ns = util.namespace('kpp.viewmodel');

    ns.IssueDragAndDrop = ns.IssueDragAndDrop || IssueDragAndDrop;

    function IssueDragAndDrop(kanban) {
        var that = this;

        that.kanban = kanban;

        that.draggingIssue = ko.observable();

        that.ondragstart = function (issue) {
            that.draggingIssue(issue);
            return true;
        };

        that.ondragover = function (stage, member, data, event) {
            if (!(member && member.isWipLimited())) {
                event.preventDefault();
            }
            return true;
        };

        that.ondrop = function (stage, member, obj, event) {
            var issue = that.draggingIssue();

            event.preventDefault();

            that.dropSuccess(stage, member, issue);

            return true;
        };

        that.dropSuccess = function (stage, member, issue) {
            // if same member, change stage
            // else assign

            var currentAssignId = issue.assignee();
            var nextAssignId = member ? member._id() : null;
            var nextAssignUserName = member ? member.userName() : null;

            if (currentAssignId !== nextAssignId) {
                that.kanban.selectedIssue(issue);
                that.kanban.assignUserName(nextAssignUserName);
                that.kanban.assignIssue();
                // stage changed to 'todo' auto
            } else {
                var currentStage = issue.stage();
                var nextStage = stage;

                if (currentStage !== nextStage) {
                    that.kanban.updateStage(issue, nextStage);
                }
            }
        };
    }

}(ko, window.nakazawa.util));