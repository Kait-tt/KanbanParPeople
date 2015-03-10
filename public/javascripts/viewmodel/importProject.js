(function (ko, util) {
    'use strict';

    var ns = util.namespace('kpp.viewmodel'),
        block = util.namespace('kpp.module').block;

    ns.ImportProject = ns.ImportProject || ImportProject;

    function ImportProject(o) {
        var that = this;

        that.opts = o;

        that.projects = o.projects;

        that.username = ko.observable();

        that.repository = ko.observable();

        that.submit = function () {
            block.connect();
            return that.projects.importGitHub({
                userName: that.username(),
                repoName: that.repository()
            }).then(block.unblock, block.unblock);
        };
    }

}(ko, window.nakazawa.util));