(function (_, util) {
    'use strict';

    var ns = util.namespace('kpp.model');

    ns.stageTypes  = ns.stageTypes  || {
        issue:   {name: 'issue', assigned: false},
        backlog: {name: 'backlog', assigned: false},
        todo:    {name: 'todo', assigned: true},
        doing:   {name: 'doing', assigned: true},
        review:  {name: 'review', assigned: true},
        done:    {name: 'done', assigned: false},
        archive:    {name: 'archive', assigned: false}
    };

    ns.stageTypeKeys = Object.keys(ns.stageTypes);

    ns.stageTypeAssignedKeys = _.chain(ns.stageTypes).values().where({assigned: true}).pluck('name').value();

}(_, window.nakazawa.util));