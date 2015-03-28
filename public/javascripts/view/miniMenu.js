(function ($, _, util) {
    'use strict';

    var ns = util.namespace('kpp.view');

    ns.MiniMenu = ns.MiniMenu || MiniMenu;

    function MiniMenu(dom) {
        this.dom = dom;
    }

    MiniMenu.init = function (selector) {
        return $(selector).map(function () {
            return new MiniMenu(this);
        });
    }


}(jQuery, _, window.nakazawa.util));