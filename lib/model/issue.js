var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var stages = require('./stages');

var Issues = new Schema({
    title: { type: String, required: true },
    body: { type: String },
    stage: { type: String, default: stages.issue, required: true },
    assigned: { type: ObjectId, ref: 'User' }, // option
    github: { // option
        number: { type: String },
        url: { type: String },
        pull_request_url: { type: String }
    },
    created_at: { type: Date, default: Date.now, required: true },
    updated_at: { type: Date, default: Date.now, required: true }
});

module.exports = mongoose.model('Issue', Issues);
