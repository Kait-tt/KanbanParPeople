var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ChatLogs = new Schema({
    sender: { type: String, required: true }, // sender user name
    content: { type: String, required: true },
    text: { type: String },
    type: { type: String, required: true },  // e.g. system, user
    projectId: { type: String, required: true }, // not object id
    created_at: { type: Date, default: Date.now, required: true }
});

if (!mongoose.models.ChatLog) { module.exports = mongoose.model('ChatLog', ChatLogs); }
else { module.exports = mongoose.model('ChatLog'); }
