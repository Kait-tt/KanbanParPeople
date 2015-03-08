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

    Project.prototype.importGitHub = function () {
        return $.ajax({
            url: this.opts.url,
            type: 'post',
            dataType: 'json'
        });
    };

}(_, window.nakazawa.util));