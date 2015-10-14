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
                var text = JSON.stringify(log);
                if (!text ||  _.isEqual(text, {})){
                    log.text = text;
                    console.log('generate: ', text);
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
