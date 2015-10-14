(function (global, $, _, util) {
    'use strict';

    var $table = $('#table');
    var logType = $table.attr('data-log-type');
    var logColumn = util.namespace('kpp.model.logColumn');

    $(function () {
        $table.bootstrapTable({
            height : getHeight(),
            columns: logColumn[logType]
        });

        // sometimes footer render error.
        setTimeout(function () {
            $table.bootstrapTable('resetView');
        }, 200);

        $(window).resize(function () {
            $table.bootstrapTable('resetView', {
                height: getHeight()
            });
        });
    });

    function responseHandler(res) {
        $.each(res.logs, function (i, log) {
            _.assign(log, log.values);
        });
        return res;
    }

    function getHeight() {
        return $(window).height() - $('h1').outerHeight(true) - 110;
    }

    // exports
    global.responseHandler = responseHandler;

}(window, jQuery, _, window.nakazawa.util));