(function (global, $, util) {
    'use strict';

    var topOffset = 60;

    $('.outline a').each(function () {
        var $that = $(this);
        var href = $that.attr('href');
        $that.click(function (e) {
            var target = $(href).offset().top - topOffset; // 描画の関係でtarget先はクリック時に計算したほうが良い
            $('html,body').animate({scrollTop: target}, 500);
            util.cancelBubble(e);
            return false;
        });
    });
    
}(window, jQuery, nakazawa.util));
