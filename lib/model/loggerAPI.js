var Log = require('./log');
var _ = require('lodash');
var log4js = require('log4js');

log4js.configure('log4js_setting.json');
var logger = log4js.getLogger('api');

logger.info('begin');

/**
 * APIアクセスをロギングする
 *
 * @constructor
 */
function LoggerAPI() { }

LoggerAPI.prototype.hook = function (req, res, next) {
    logging(req);
    next();
};

LoggerAPI.prototype.logging = logging;

function logging(req) {
    var username = (req.user && req.user.username) ? req.user.username : null;
    var params = {method: req.method, path: req.route.path, username: username, params: req.params, query: req.query, body: req.body};
    logger.info(params.method + ' ' + params.path + ': ' + JSON.stringify(_.omit(params)));
    Log.logging(params);
}


module.exports = LoggerAPI;