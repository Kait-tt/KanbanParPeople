(function (_, util) {
    'use strict';

    var ns = util.namespace('kpp.model');

    ns.stageTypes  = ns.stageTypes  || {
        todo:   {name: 'todo', dividedByMember: true},
        doing:  {name: 'doing', dividedByMember: true},
        review: {name: 'review', dividedByMember: true},
        done:   {name: 'done', dividedByMember: true}
    };

}(_, window.nakazawa.util));