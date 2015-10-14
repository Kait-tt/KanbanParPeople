var _ = require('underscore');
var config = require('config');
var async = require('async');
var mongoose = require('mongoose');
var Log = require('../lib/model/log');

console.log('### generate log model\'s text parameter ###');

mongoose.connect(config.get('mongo.url'));


async.series([
    function (next) {
        Log.find({}, function (err, logs) {
            if (err) { return next(err); }
            async.each(logs, function (log, nextLog) {
                if (log.values.method && log.values.path) {
                    console.log('set type: ', log.values.method, log.values.path);
                    log.values.type = 'api';
                    log.markModified('values');
                    log.save(nextLog);
                } else {
                    nextLog();
                }
            }, next);
        });
    }

], function (err) {
    if (err) {
        console.error(err);
    } else {
        console.log('done');
    }
    mongoose.disconnect();
});
