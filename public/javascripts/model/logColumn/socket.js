(function (_, util) {
    'use strict';

    var ns = util.namespace('kpp.model.logColumn');

    ns.socket = ns.socket || [
            {
                title: 'Action',
                field: 'action'
            },
            {
                title: 'Key',
                field: 'key'
            },
            {
                title: 'ProjectID',
                field: 'projectId'
            },
            {
                title: 'User',
                field: 'username'
            },
            {
                title: 'Request or Response',
                field: 'req',
                formatter: function (value, row, index) {
                    return JSON.stringify(value ? value : row.res);
                },
                visible: false
            },
            {
                title: 'Time',
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