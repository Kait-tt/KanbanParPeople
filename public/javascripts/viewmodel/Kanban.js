(function (ko, io, util) {
    'use strict';

    var ns = util.namespace('kpp.viewmodel'),
        model = util.namespace('kpp.model'),
        User = model.User,
        Issue = model.Issue;

    ns.Kanban = ns.Kanban || Kanban;

    function Kanban(o) {
        var that = this;

        that.members = ko.observableArray();

        that.issues = ko.observableArray();

        that.project = null;

        that.init = function (project) {
            that.project = project;
            that.members = project.members;
            that.issues = project.issues;

            that.socket = io.connect();

            that.socket.on('connect', function () {
                that.socket.emit('join-project-room', {projectId: that.project.id}, function (res) {
                    console.log(res);
                });
            });
        };

        that.removeMember = function (member) {
            that.socket.emit('remove-member', {userName: member.userName}, function (res) {
                that.members.remove(member);
                console.log(res);
            });
        };
    }

}(ko, io, window.nakazawa.util));