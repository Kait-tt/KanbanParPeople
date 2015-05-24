(function (_, util) {
    'use strict';

    var ns = util.namespace('kpp.model'),
        Project = ns.Project,
        defaultOptions = {
            url: '/api/projects'
        };

    ns.Projects = ns.Projects || Projects;

    function Projects(o) {
        this.opts = _.defaults(o || {}, defaultOptions);

        this.items = ko.observableArray();
    }

    Projects.prototype.fetch = function () {
        return $.ajax({
            url: this.opts.url,
            type: 'get',
            dataType: 'json'
        }).then(function (res) {
            _.each(res.projects, function (project) {
                var item = new Project(project);
                this.items.push(item);
            }.bind(this));
            this.items.sort(Projects.sortFunc);
        }.bind(this));
    };

    Projects.prototype.importGitHub = function (o) {
        return $.ajax({
            url: this.opts.url,
            type: 'post',
            dataType: 'json',
            data: _.pick(o, 'userName', 'repoName')
        }).then(function (res) {
            var item = new Project(res.project);
            this.items.push(item);
            this.items.sort(Projects.sortFunc);
        }.bind(this));
    };

    Projects.sortFunc = function (a, b) {
        return util.comp(a._id, b._id, true);
    };

}(_, window.nakazawa.util));