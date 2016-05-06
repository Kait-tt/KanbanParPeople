(function (_, util) {
    'use strict';

    var ns = util.namespace('kpp.view');

    ns.effects = ns.effects || {
        fadeIn: function (elm) {
            $(elm).hide().fadeIn('slow');
        },

        fadeOut: function (elm) {
            $(elm).fadeOut('slow', function () { $(elm).remove() });
        },

        slideDown: function (elm) {
            $(elm).hide().slideDown();
        },

        slideUp: function (elm) {
            var $elm = $(elm);
            $elm.slideUp(function () {
                $elm.remove();
            });
        },

        scrollDown: function (elm, idx, item) {
            if (elm.nodeType !== 1) { return; }
            var $elm = $(elm).eq(0);
            var $wrap = $elm.parents('.scroll-wrap').eq(0);
            $wrap.scrollTop(($elm.height() + 10) * (idx + 1));
        },

        applyBindings: function (global) {
            if (!global.view) { global.view = {}; }
            global.view.effects = this;
        }
    };


}(_, window.nakazawa.util));