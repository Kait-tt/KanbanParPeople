(function (global, $, util) {
    'use strict';

    var ns =  util.namespace('kpp.module'),
        dummyStorage = {
            data: {},
            getItem: function (key) { return this.data[key]; },
            setItem: function (key, val) { this.data[key] = [val]; }
        },
        storage = ('localStorage' in global && global.localStorage) || dummyStorage,
        defaultSettings = {
            viewMode: 'full'
        },
        storageWrap = {};

    storageWrap.load = function () {
        _.each(defaultSettings, function (defaultValue, key) {
            if (storage.getItem(key) === null || storage.getItem(key) === undefined) {
                storage.setItem(key, defaultValue);
            }
        });
        storageWrap.validate();
        return storageWrap;
    };

    storageWrap.validate = function () {
        if (!_.includes(['full', 'compact'], storage.getItem('viewMode'))) {
            console.error('viewMode is invalid in localStorage: ' + storage.getItem('viewMode'));
            storage.setItem('viewMode', defaultSettings.viewMode);
        }
    };

    storageWrap.setItem = function (key, val) {
        storage.setItem(key, val);
    };

    storageWrap.getItem = function (key) {
        return storage.getItem(key);
    };

    /**
     * localStorageのラッパー
     */

    ns.localStorage = storageWrap;


}(window, jQuery, window.nakazawa.util));