(function ($, _, util) {
    'use strict';

    var ns = util.namespace('kpp.view'),
        defaultSelector = '.mini-menu',
        defaultOptions = {
            r: 90,
            duration: 200,
            easing: 'easeOutCubic',
            margin: 0,
            hideEventDebounceTime: 500, // (ms)
            onInitialized: function ($dom, $ul, $li, context) {}
        };

    ns.MiniMenu = ns.MiniMenu || MiniMenu;

    function MiniMenu(dom, o) {
        var that = this;

        that.opts = _.defaults(o || {}, defaultOptions);

        that.$dom = $(dom);
        if (that.$dom.length === 0) { return; }
        that.$defaultButton = that.$dom.children('.mini-menu-default');
        that.$ul = that.$dom.children('ul.mini-menu-list');
        that.$li = that.$ul.children('li');
        that.iconSize = that.$dom.children('.mini-menu-default').height();

        // add mouse event
        that.$dom
            .mouseenter(function () { that.show(); })
            .mouseleave(function () { that.hide(); });

        // to initialize position and hidden
        that.initializeMenu();
        that.$ul.show();
        that.$li.each(function () {
            $(this).hide();
        });

        that.opts.onInitialized(that.$dom, that.$ul, that.$li, that);
    }

    MiniMenu.prototype.initializeMenu = function () {
        var that = this;

        that.$ul
            .stop(true, false)
            .css({
                width: 0,
                height: 0,
                top: that.$dom.position().top + that.iconSize / 2,
                left: that.$dom.position().left + that.iconSize / 2
            });

        that.$li.each(function () {
            var halfIconSize = that.iconSize / 2;

            $(this)
                .stop(true, false)
                .css({
                    top : -halfIconSize,
                    left: -halfIconSize
                })
                .hide();
        });
    };

    MiniMenu.prototype.show = function () {
        this.$li = this.$ul.children('li'); // 変更されているかもしれないので取得しなおす

        var that = this,
            len = that.$li.length,
            duration = that.opts.duration,
            easing = that.opts.easing,
            margin = that.opts.margin,
            r = that.opts.r;

        that.initializeMenu();

        that.$ul
            .stop(true, false)
            .show()
            .animate({
                width: r,
                height: r,
                borderRadius:r,
                top : that.$dom.position().top + r / -2 + that.iconSize / 2,
                left: that.$dom.position().left + r / -2 + that.iconSize / 2
            }, duration, easing);

        that.$li.each(function (i) {
            var rate = i / len;
            var alpha = Math.PI * 2 * rate - Math.PI / 2;
            var halfIconSize = that.iconSize / 2;
            var halfR = r / 2;

            $(this)
                .stop(true, false)
                .show()
                .animate({
                    top : -halfIconSize + halfR + Math.sin(alpha) * (halfR - halfIconSize - margin),
                    left: -halfIconSize + halfR + Math.cos(alpha) * (halfR - halfIconSize - margin)
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
                top : that.$dom.position().top + that.iconSize / 2,
                left: that.$dom.position().left + that.iconSize / 2
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
    };

    // to knockout
    MiniMenu.applyBindings = function (global, o) {
        if (!global.view) { global.view = {}; }

        if (!global.view.MiniMenu) {
            global.view.MiniMenu = {
                init: function (doms) {
                    doms.forEach(function (dom) {
                        new MiniMenu($(dom).find(defaultSelector), o);
                    });
                }
            };
        }
    };

}(jQuery, _, window.nakazawa.util));