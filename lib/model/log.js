var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Mixed = Schema.Types.Mixed;

var Logs = new Schema({
    values: { type: Mixed },
    created_at: { type: Date, default: Date.now, required: true },
    updated_at: { type: Date, default: Date.now, required: true },
    text: { type: String }
});

// textプロパティ生成
Logs.pre('save', function (next) {
    this.text = JSON.stringify(this);
    next();
});

Logs.static('logging', function (values, callback) {
    var log = new this({values: values});
    log.markModified('values');
    log.save(callback || function(){});
});

if (!mongoose.models.Log) { module.exports = mongoose.model('Log', Logs); }
else { module.exports = mongoose.model('Log'); }
