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
        },

        /**
         * 汎用比較関数
         * aとbが等しければ0を返す
         * bよりaのほうが小さければ-1を返す
         * bよりaのほうが大きければ1を返す
         * reverse == trueのとき、-1と1は反転する
         * @param a
         * @param b
         * @param reverse
         * @returns {number}
         */
        comp: function (a, b, reverse) {
            if (a === b) { return 0; }
            if (a < b) { return reverse ? 1 : -1; }
            return reverse ? -1 : 1;
        },

        /**
         * DOMイベントバブルを無効にする
         *
         * @param {Event} e イベントオブジェクト
         * @returns {boolean} falseを返してキャンセルする
         */
        cancelBubble: function (e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        },

        moveToBefore: function (ary, target, beforeOf) {
            // remove
            ary.splice(ary.indexOf(target), 1);

            // insert
            if (!beforeOf) {
                ary.push(target);
            } else {
                ary.splice(ary.indexOf(beforeOf), 0, target);
            }

            return ary;
        },

        /**
         * aryにitemを追加する
         * 既に存在していたら何もしない
         *
         * @param ary
         * @param item
         */
        safePush: function (ary, item) {
            if (ary.indexOf(item) === -1) {
                ary.push(item);
            }
            return ary;
        },

        /**
         * aryからitemを削除する
         * 存在しない場合は何もしない
         *
         * @param ary
         * @param item
         */
        safeRemove: function (ary, item) {
            var idx = ary.indexOf(item);
            if (idx !== -1) {
                ary.splice(idx, 1);
            }
            return ary;
        },

        dateFormatHM: function (time) {
            time = new Date(time);
            var hour = Math.floor(time / 60 / 60 / 1000);
            var minute = Math.round((time - hour * 60 * 60 * 1000) / 60 / 1000);
            return hour ? (hour + '時間' + minute + '分') : minute + '分';
        },

        secondsFormatHM: function (seconds) {
            var hour = Math.floor(seconds / 60 / 60);
            var minute = Math.round((seconds - hour * 60 * 60) / 60);
            return hour ? (hour + '時間' + minute + '分') : minute + '分';
        },

        dateFormatYMDHM: function (time) {
            return (moment.isMoment(time) ? time : moment(new Date(time))).format('YYYY/MM/DD HH:mm:ss');
        },

        // " や ' を考慮してテキストを分割する
        splitSearchQuery: function (text) {
            if (!_.isString(text)) { return []; }
            text = text.trim();

            var res = [];
            var quote = null;
            var str = '';

            text.split('').forEach(function (c) {
                if (c === '"') {
                    if (quote === c) {
                        pushString();
                    } else if (quote === '\'') {
                        str += c;
                    } else {
                        quote = c;
                    }

                } else if (c === '\'') {
                    if (quote === c) {
                        pushString();
                    } else if (quote === '"') {
                        str += c;
                    } else {
                        quote = c;
                    }

                } else if (c === ' ') {
                    if (quote) {
                        str += c;
                    } else {
                        pushString();
                    }

                } else {
                    str += c;
                }
            });

            if (str) { res.push(str); }

            return res;

            function pushString() {
                if (str.length) {
                    res.push(str);
                    str = '';
                }
                quote = null;
            }
        }
    };
}(window, _));