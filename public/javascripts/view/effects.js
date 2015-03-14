(function (_, util) {
    'use strict';

    var ns = util.namespace('kpp.view');

    ns.effects = ns.effects || {
        fadeIn: function (elm) {
            $(elm).hide().fadeIn();
        },

        fadeOut: function (elm) {
            $(elm).fadeOut(null, function () { $(elm).remove() });
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

        applyBindings: function (global) {
            global.effects = this;
        }
    };


}(_, window.nakazawa.util));