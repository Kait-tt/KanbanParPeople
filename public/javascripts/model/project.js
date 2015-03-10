(function (_, util) {
    'use strict';

    var ns = util.namespace('kpp.model'),
        defaultOptions = {
            url: '/api/projects'
        };

    ns.Project = ns.Project || Project;

    function Project(o) {
        this.opts = _.defaults(o || {}, defaultOptions);
    }

    Project.prototype.importGitHub = function (o)
    {
        return $.ajax({
            url: this.opts.url,
            type: 'post',
            dataType: 'json',
            data: _.pick(o, 'userName', 'repoName')
        });
    };

}(_, window.nakazawa.util));