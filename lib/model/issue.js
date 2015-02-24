var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var stages = {
    issue: 'issue',
    todo: 'todo',
    doing: 'doing',
    review: 'review',
    done: 'done'
};

var Issues = new Schema({
    name: { type: String, required: true },
    stage: { type: String, default: stages.issue, required: true },
    assigned: { type: ObjectId, ref: 'User', required: true },
    created_at: { type: Date, default: Date.now, required: true }
});

Issues.stages = stages;

module.exports = mongoose.model('Issue', Issues);