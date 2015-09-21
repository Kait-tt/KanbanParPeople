(function (_, ko, $, util) {
    'use strict';

    var ns = util.namespace("util.viewmodel"),
        defaultOptions = {
            maxAlertNum: 5,
            waitHideTime: 8000
        };

    /**
     * AlertViewModelが対象とするコンストラクタ関数
     *
     * @param {Object} [o]
     * @param {string=} [o.title=""]
     * @param {string=} [o.message=""]
     * @param {boolean=} [o.isSuccess=""]
     * @constructor
     */
    ns.AlertContent = function AlertContent(o) {
        o = _.isObject(o) ? o : {};
        this.title = o.title === undefined ? '' : o.title;
        this.message = o.message === undefined ? '' : o.message;
        this.isSuccess = o.isSuccess === undefined ? false : o.isSuccess
    };

    /**
     * 自作アラートのViewModeコンストラクタ関数
     *
     * @param {Object} [o]
     * @param {number=} [o.maxAlertNum=5] アラートの最大表示数
     * @param {number=} [o.waitHideTime=8000] アラートを表示してから自動的に消えるまでの時間
     * @constructor
     */
    ns.Alert = function Alert(o) {
        var that = this,
            options = _.defaults(o || {}, defaultOptions);

        /**
         * 有効なアラートコンテンツ
         *
         * @type {Array.<util.viewmodel.AlertContent>}
         */
        that.alerts = ko.observableArray();

        /**
         * アラートコンテンツを追加する
         *
         * @param {Object} [content]
         * @param {string=} [content.title=""]
         * @param {string=} [content.message=""]
         * @param {boolean=} [content.isSuccess=""]
         * @returns {util.viewmodel.Alert}
         */
        that.pushAlert = function (content) {
            var obj = new ns.AlertContent(content);

            that.alerts.unshift(obj);

            // maxAlert以上のアラートを削除
            that.alerts.splice(options.maxAlertNum);

            // x秒後に自動的に削除
            setTimeout(function () {
                that.alerts.remove(obj);
            }, options.waitHideTime);

            return that;
        };

        /**
         * Deferredインターフェースを備えた関数に対し、後方にpushAlertを挿入しラッピングする
         *
         * @param {function(...): Deferred} deferred Deferredインターフェースを備えているラッピング対象の関数
         * @param {string|function(...): Deferred=} success_message
         * @param {string|function(...): Deferred=} error_message
         * @returns {function(...): Deferred}}
         */
        that.wrapDeferred = function (deferred, success_message, error_message) {
            if (!_.isFunction(deferred)) {
                return deferred;
            }

            return function () {
                return deferred.apply(this, arguments)
                    .done(function () {
                        if (success_message !== undefined) {
                            that.pushAlert({
                                title: "success!",
                                isSuccess: true,
                                message: _.isFunction(success_message) ? success_message() : success_message
                            });
                        }
                    })
                    .fail(function () {
                        if (error_message !== undefined) {
                            that.pushAlert({
                                title: "error...",
                                isSuccess: false,
                                message: _.isFunction(error_message) ? error_message() : error_message
                            });
                        }
                    })
            }
        };

        /**
         * object の持つ複数の関数に対してAlertラッピングを適用する（objectに対して破壊的）
         *
         * @param {!Object} object
         * @param {Array.<{methodName: string, successMessage: string|function(...): string=,
         *     errorMessage: string|function(...): string=}>} params
         */
        that.wrapDeferredAll = function (object, params) {
            _.each(params, function (param) {
                if (_.isObject(param) && _.isFunction(object[param.methodName])) {
                    object[param.methodName] = that.wrapDeferred(
                        object[param.methodName],
                        param.successMessage,
                        param.errorMessage
                    );
                }
            });
        };

    };

}(_, ko, jQuery, window.nakazawa.util));