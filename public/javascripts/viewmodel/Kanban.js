(function (ko, io, util) {
    'use strict';

    var ns = util.namespace('kpp.viewmodel'),
        model = util.namespace('kpp.model'),
        User = model.User,
        Issue = model.Issue;

    ns.Kanban = ns.Kanban || Kanban;

    function Kanban(o) {
        var that = this;

        that.members = null;

        that.issues = null;

        that.project = null;

        that.addMemberUserName = ko.observable();

        that.addIssueTitle = ko.observable();

        that.addIssueBody = ko.observable();

        that.assignUserName = ko.observable();

        that.selectedIssue = ko.observable();

        that.init = function (project) {
            that.project = project;
            that.members = project.members;
            that.issues = project.issues;
            initSocket();
            initSocketDebugMode();
        };

        that.addMember = function () {
            that.socket.emit('add-member', {userName: that.addMemberUserName()}, function (res) {
                if (res.status === 'success') {
                    // reset
                    that.addMemberUserName(null);
                }
            });
        };

        that.removeMember = function (member) {
            that.socket.emit('remove-member', {userName: member.userName}, function (res) { });
        };

        that.addIssue = function () {
            var title = that.addIssueTitle();
            var body = that.addIssueBody();

            that.socket.emit('add-issue', {title: title, body: body}, function (res) {
                if (res.status === 'success') {
                    // reset
                    that.addIssueTitle(null);
                    that.addIssueBody(null);
                }
            });
        };

        that.removeIssue = function (issue) {
            that.socket.emit('remove-issue', {issueId: issue._id()}, function (res) { });
        };

        that.assignIssue = function () {
            var issue = that.selectedIssue();
            var userName = that.assignUserName();

            var user = _.findWhere(that.members(), {userName: userName});

            that.socket.emit('assign', {issueId: issue._id(), userId: user ? user._id : null}, function () {
                // reset
                that.selectedIssue(null);
                that.assignUserName(null);
            });
        };

        function initSocket () {
            that.socket = io.connect();

            that.socket.on('connect', function () {
                that.socket.emit('join-project-room', {projectId: that.project.id});
            });

            that.socket.on('add-member', function (res) {
                that.members.unshift(new User(res.member.user));
            });

            that.socket.on('remove-member', function (res) {
                var targetMember = _.find(that.members(), function (member) {
                    return member._id === res.member.user._id;
                });
                that.members.remove(targetMember);
            });

            that.socket.on('add-issue', function (res) {
                that.issues.unshift(new Issue(res.issue));
            });

            that.socket.on('remove-issue', function (res) {
                var targetIssue = _.find(that.issues(), function (issue) {
                    return issue._id() === res.issue._id;
                });
                that.issues.remove(targetIssue);
            });

            that.socket.on('assign', function (res) {
                that.project.assignIssue(res.issueId, res.memberId);
            });
        }

        function initSocketDebugMode () {
            var onKeys = ['connect', 'add-member', 'remove-member', 'add-issue', 'remove-issue', 'assign'];

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

}(ko, io, window.nakazawa.util));