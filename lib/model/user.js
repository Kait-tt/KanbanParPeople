var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Users = new Schema({
    username: { type: String, required: true },
    displayName: { type: String, required: true },
    created_at: { type: Date, default: Date.now, required: true }
});

module.exports = mongoose.model('User', Users);