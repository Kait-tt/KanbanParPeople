(function ($, util) {
    'use strict';

    var ns =  util.namespace('kpp.module');

    /**
     * jQuery.blockUIのラッパー
     */
    ns.block = ns.block || {
        connect: function () {
            $.blockUI({message: '<h4><img src="/images/loader-24.gif"> Connecting...</h4>'});
        },

        unblock: function () {
            $.unblockUI();
        }
    };

}(jQuery, window.nakazawa.util));