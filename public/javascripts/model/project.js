(function (_, util) {
    'use strict';

    var ns = util.namespace('kpp.model'),
        defaultOptions = {
            url: '/api/projects'
        },
        columnKeys = [
            'create_user',
            'created_at',
            'github',
            'id',
            'issues',
            'members',
            'name'
        ];

    ns.Project = ns.Project || Project;

    function Project(o) {
        o = o || {};
        this.opts = _.defaults(o || {}, defaultOptions);

        _.each(columnKeys, function (key) {
            this[key] = o[key];
        }.bind(this));

        this.url = '/users/' + this.create_user + '/projects/' + this.name;
    }

}(_, window.nakazawa.util));