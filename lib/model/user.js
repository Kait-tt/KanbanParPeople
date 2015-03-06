var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Users = new Schema({
    userName: { type: String, required: true },
    created_at: { type: Date, default: Date.now, required: true }
});

// Userを取得する
// 存在しない検索条件なら、作成して返す
Users.static('findOrCreate', function (userName, callback) {
    var that = this;
    that.findOne({userName: userName}).exec(function (err, user) {
        if (err) { callback(err); return; }

        if (user !== null) {    // ユーザが存在した
            callback(null, user);
            return;
        }

        that.create({userName: userName}, function (err, user) {
            if (err) { callback(err); }
            else { callback(null, user); }
        });
    });
});

module.exports = mongoose.model('User', Users);