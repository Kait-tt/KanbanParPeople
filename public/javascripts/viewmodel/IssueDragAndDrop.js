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
            console.log(member, stage, issue);

            // TODO: drop process


            return true;
        };
    }

}(ko, io, window.nakazawa.util));