(function (_, util) {
    'use strict';

    var ns = util.namespace('kpp.model.logColumn');

    ns.socket = ns.socket || [
            {
                title: 'action',
                field: 'action'
            },
            {
                title: 'key',
                field: 'key'
            },
            {
                title: 'projectId',
                field: 'projectId'
            },
            {
                title: 'username',
                field: 'username'
            },
            {
                title: 'req or Response',
                field: 'req',
                formatter: function (value, row, index) {
                    return JSON.stringify(value ? value : row.res);
                },
                visible: false
            },
            {
                title: 'created_at',
                field: 'created_at',
                formatter: function (value, row, index) {
                    if (!value) { return null; }
                    var t = new Date(value);
                    return t.getFullYear() + '-' +
                        _.padLeft(t.getMonth() + 1, 2, '0') + '-' +
                        _.padLeft(t.getDate(), 2, '0') + ' ' +
                        _.padLeft(t.getHours(), 2, '0') + ':' +
                        _.padLeft(t.getMinutes(), 2, '0') + ':' +
                        _.padLeft(t.getSeconds(), 2, '0');
                }
            }
        ];

}(_, window.nakazawa.util));