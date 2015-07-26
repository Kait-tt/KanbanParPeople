var asyncWrap = {
    /**
     * 非同期のエラー処理をラッピング
     *
     * @param errFunc 異常時に処理するコールバック
     * @param func func(args...) 正常時に処理するコールバック
     */
    errorWrap: function (errFunc, func) {
        return function (err, args) {
            if (err) { errFunc(err); }
            else { func.apply(null, Array.prototype.splice.call(arguments, 1)); }
        };
    }
};

module.exports = asyncWrap;
