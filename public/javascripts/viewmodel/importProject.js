(function (ko, util) {
    'use strict';

    var ns = util.namespace('kpp.viewmodel'),
        block = util.namespace('kpp.module').block,
        Project = util.namespace('kpp.model').Project;

    ns.ImportProject = ns.ImportProject || ImportProject;

    function ImportProject(o) {
        var that = this;

        that.opts = o;

        that.project = new Project(o);

        that.username = ko.observable();

        that.repository = ko.observable();

        that.submit = function () {
            block.connect();
            return that.project.importGitHub()
                .then(block.unblock, block.unblock);
        }
    }

}(ko, window.nakazawa.util));