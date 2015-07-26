var async = require('async');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ew = require('../module/util/asyncWrap').errorWrap;

var Users = new Schema({
    userName: { type: String, required: true },
    created_at: { type: Date, default: Date.now, required: true }
});

// Userを取得する
// 存在しない検索条件なら、作成して返す
Users.static('findOrCreate', function (userName, callback) {
    var that = this;
    that.findOne({userName: userName}).exec(ew(callback, function (user) {
        // ユーザが存在した
        if (user !== null) { return callback(null, user); }

        // ユーザが存在しなかったので作成して返す
        that.create({userName: userName}, ew(callback, function (user) {
            callback(null, user);
        }));
    }));
});

if (!mongoose.models.User) { module.exports = mongoose.model('User', Users); }
else { module.exports = mongoose.model('User'); }