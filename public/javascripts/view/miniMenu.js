(function ($, _, util) {
    'use strict';

    var ns = util.namespace('kpp.view'),
        defaultSelector = '.mini-menu',
        defaultOptions = {
            r: 100,
            duration: 500,
            easing: 'easeOutCubic'
        };

    ns.MiniMenu = ns.MiniMenu || MiniMenu;

    function MiniMenu(dom, o) {
        var that = this;

        that.opts = _.defaults(o || {}, defaultOptions);

        that.$dom = $(dom);
        that.$defaultButton = that.$dom.children('.mini-menu-default');
        that.$ul = that.$dom.children('ul.mini-menu-list');
        that.$li = that.$ul.children('li');
        that.iconSize = that.$dom.children('.mini-menu-default').height();

        // add mouse event
        that.$defaultButton.mouseenter(function () {
            that.show();
        });

        that.$ul.mouseleave(function () {
            that.hide();
        });

        // to initialize position and hidden
        that.$ul
            .stop(true, true)
            .css({
                width: 0,
                height: 0,
                borderRadius:0,
                top: that.iconSize / 2,
                left: that.iconSize / 2
            })
            .hide();

        that.$li.each(function () {
            var halfIconSize = that.iconSize / 2;

            $(this)
                .stop(true, true)
                .css({
                    top : -halfIconSize,
                    left: -halfIconSize
                })
                .hide();
        });
    }

    MiniMenu.prototype.show = function () {
        var that = this,
            len = that.$li.length,
            duration = that.opts.duration,
            easing = that.opts.easing,
            r = that.opts.r;

        that.$ul
            .stop(true, false)
            .show()
            .animate({
                width: r,
                height: r,
                borderRadius:r,
                top: r / -2 + that.iconSize / 2,
                left: r / -2 + that.iconSize / 2
            }, duration, easing);

        that.$li.each(function (i) {
            var rate = i / len;
            var alpha = Math.PI * 2 * rate;
            var halfIconSize = that.iconSize / 2;
            var halfR = r / 2;

            $(this)
                .stop(true, false)
                .show()
                .animate({
                    top : -halfIconSize + halfR + Math.sin(alpha) * (halfR - halfIconSize),
                    left: -halfIconSize + halfR + Math.cos(alpha) * (halfR - halfIconSize)
                }, duration, easing);
        });
    };

    MiniMenu.prototype.hide = function () {
        var that = this,
            duration = that.opts.duration,
            easing = that.opts.easing;

        that.$ul
            .stop(true, false)
            .animate({
                width: 0,
                height: 0,
                borderRadius:0,
                top: that.iconSize / 2,
                left: that.iconSize / 2
            }, duration, easing, function () { $(this).hide(); });

        that.$li.each(function () {
            var halfIconSize = that.iconSize / 2;

            $(this)
                .stop(true, false)
                .animate({
                    top : -halfIconSize,
                    left: -halfIconSize
                }, duration, easing, function () { $(this).hide(); });
        });
    };

    MiniMenu.init = function (selector, o) {
        return $(selector || defaultSelector).map(function () {
            return new MiniMenu(this, o);
        });
    }


}(jQuery, _, window.nakazawa.util));