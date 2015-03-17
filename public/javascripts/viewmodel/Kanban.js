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

        that.addMemberUserName = ko.observable();

        that.init = function (project) {
            that.project = project;
            that.members = project.members;
            that.issues = project.issues;
            initSocket();
        };

        that.removeMember = function (member) {
            that.socket.emit('remove-member', {userName: member.userName}, function (res) {
                console.log(res);
            });
        };

        that.addMember = function () {
            that.socket.emit('add-member', {userName: that.addMemberUserName()}, function (res) {
                console.log(res);
            });
        };

        function initSocket () {
            that.socket = io.connect();

            that.socket.on('connect', function () {
                that.socket.emit('join-project-room', {projectId: that.project.id}, function (res) {
                    console.log(res);
                });
            });

            that.socket.on('remove-member', function (res) {
                var targetMember = _.find(that.members(), function (member) {
                    return member._id === res.member.user._id;
                });
                that.members.remove(targetMember);
            });

            that.socket.on('add-member', function (res) {
                that.members.unshift(new User(res.member.user));
            });
        }
    }

}(ko, io, window.nakazawa.util));