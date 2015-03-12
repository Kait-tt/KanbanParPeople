(function (global, _) {
    'use strict';

    var ns = (function () {
        global.nakazawa = global.nakazawa || {};
        return global.nakazawa;
    }());

    /**
     * ユーティリティモジュール
     */
    ns.util = ns.util || {
        /**
         * 名前空間解決関数
         * ドット区切りの名前空間を与えると、その名前空間を生成また取得して返す。
         * @param ns_string
         * @returns {window|*}
         */
        namespace: function (ns_string) {
            var parts = ns_string.split('.'),
                parent = ns,
                i;

            for (i = 0; i < parts.length; i++) {
                if (parent[parts[i]] === undefined) {
                    parent[parts[i]] = {};
                }
                parent = parent[parts[i]];
            }

            return parent;
        },

        /**
         * HTTP.GETクエリーのパーサー
         *
         * @param query ?から始まるパースする文字列(e.g. window.location.search)
         * @returns {{}}
         */
        parseGetQuery: function (query) {
            var result = {},
                qry,
                params,
                element,
                i;

            if (1 < query.length) {
                qry = query.substring(1);
                params = qry.split('&');

                for (i = 0; i < params.length; i++) {
                    element = params[i].split('=');
                    result[decodeURIComponent(element[0])] = decodeURIComponent(element[1]);
                }
            }

            return result;
        },

        /**
         * 多次元配列の初期化
         *
         * @param ns
         * @param init
         * @returns {*[]}
         */
        initArray: function (ns, init) {
            var x = ns[0],
                xs = _.rest(ns),
                ary = [x],
                i;

            for (i = 0; i < x; i++) {
                ary[i] = xs.length > 0 ? this.initArray(xs, init) : init ? init() : [];
            }

            return ary;
        },

        inherits: function(ctor, superCtor) {
            ctor.super_ = superCtor;
            ctor.prototype = Object.create(superCtor.prototype, {
                constructor: {
                    value: ctor,
                    enumerable: false,
                    writable: true,
                    configurable: true
                }
            });
        }
    };
}(window, _));