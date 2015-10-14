(function (_, util) {
    'use strict';

    var ns = util.namespace('kpp.model.logColumn');

    ns.api = ns.api || [
            {
                title: 'Method',
                field: 'method'
            },
            {
                title: 'Path',
                field: 'path',
                formatter: function (value, row, index) {
                    var res = String(value);
                    if (row.params) {
                        _.forEach(row.params, function (v, k) {
                            res = res.replace(k, v);
                        });
                    }
                    return res;
                }
            },
            {
                title: 'User',
                field: 'username'
            },
            {
                title: 'Params',
                field: 'params',
                formatter: function (value, row, index) {
                    return JSON.stringify(value);
                },
                visible: false
            },
            {
                title: 'Query',
                field: 'query',
                formatter: function (value, row, index) {
                    return JSON.stringify(value);
                },
                visible: false
            },
            {
                title: 'Body',
                field: 'body',
                formatter: function (value, row, index) {
                    return JSON.stringify(value);
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