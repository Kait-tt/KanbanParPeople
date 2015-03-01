var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var stages = require('./stages');

var Issues = new Schema({
    name: { type: String, required: true },
    stage: { type: String, default: stages.issue, required: true },
    assigned: { type: ObjectId, ref: 'User', required: true },
    created_at: { type: Date, default: Date.now, required: true }
});

module.exports = mongoose.model('Issue', Issues);
