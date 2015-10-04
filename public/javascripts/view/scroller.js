(function (_, $, util) {
    'use strict';

    var ns = util.namespace('kpp.view'),
        defaultOptions = {
            selectors: [],
            cancelSelectors: [],
            target: window,
            step: 1
        };

    /**
     * 背景ドラッグで画面をスクロールするView
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
                $('body').delegate(selector, 'mousedown', that.onMousedown);
            });

            // cancel
            that.opts.cancelSelectors.forEach(function (selector) {
                $('body').delegate(selector, 'mousedown', that.cancel);
            });

            // move event
            $(window).mousemove(that.onMousemove);

            $(window).mouseup(that.cancel);
        };

        that.cancel = function (e) {
            e.canceled = true;
            that.isClicked = false;
            that.beforeX = null;
        };

        that.onMousedown = function (e) {
            if (!e.canceled && e.button === 0) { // 左クリックのみ作動
                that.isClicked = true;
                that.beforeX = e.screenX;
            }
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