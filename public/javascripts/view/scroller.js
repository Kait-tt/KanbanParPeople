(function (_, $, util) {
    'use strict';

    var ns = util.namespace('kpp.view'),
        defaultOptions = {
            selectors: [],
            cancelSelectors: [],
            target: 'body',
            step: 1
        };

    /**
     * ドラッグアンドドロップで画面をスクロールするView
     *
     */
    ns.Scroller = ns.Scroller || Scroller;

    function Scroller(o) {
        var that = this;

        that.init = function () {
            that.opts = _.extend(defaultOptions, o || {});
            that.$contexts = that.opts.selectors.map(function (selector) { return $(selector); });
            that.$target = $(that.opts.target);

            that.isClicked = false;
            that.beforeX = null;

            // scroll event
            that.opts.selectors.forEach(function (selector) {
                $('body')
                    .delegate(selector, 'mousedown', that.onMousedown)
                    .delegate(selector, 'mouseup', that.onMouseup)
                    .delegate(selector, 'mousemove', that.onMousemove)
            });

            // cancel
            that.opts.cancelSelectors.forEach(function (selector) {
                $('body')
                    .delegate(selector, 'mousedown', that.cancel)
                    .delegate(selector, 'mouseup', that.cancel)
                    .delegate(selector, 'mousemove', that.cancel);
            });
        };

        that.cancel = function () {
            that.isClicked = false;
            that.beforeX = null;
        };

        that.onMousedown = function (e) {
            that.isClicked = true;
            that.beforeX = e.screenX;
        };

        that.onMouseup = that.cancel;

        that.onMousemove = function (e) {
            var now, diff;

            if (that.isClicked) {
                now = e.screenX;
                diff = now - that.beforeX;
                that.$target.scrollLeft(that.$target.scrollLeft() - diff * that.opts.step);
                that.beforeX = now;

                return false;
            }
        };

        that.init();
    }



}(_, jQuery, window.nakazawa.util));