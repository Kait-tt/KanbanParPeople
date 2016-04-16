var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var Label = require('./label');
var User = require('./user');

var stages = require('./stages');
var stageTypes = require('./stageTypes');

var Issues = new Schema({
    title: { type: String, required: true },
    body: { type: String },
    stage: { type: String, default: stages.issue, required: true },
    assignee: { type: ObjectId, ref: 'User', default: null }, // option
    cost: { type: Number, default: 0, required: null }, // 0(null), 1(low), 3(middle), 5(high)
    isWorking: { type: Boolean, default: false, required: true },
    workHistory: [{
        startTime: { type: Date, required: true },
        endTime: { type: Date },
        isEnded: { type: Boolean, default: false, required: true },
        userId: { type: ObjectId, ref: 'User', required: true }
    }],
    github: { // option
        number: { type: String, default: 0 },
        url: { type: String, default: '' },
        pull_request_url: { type: String, default: '' }
    },
    labels: [{ type: ObjectId, ref: 'Label' }], // attached labels
    created_at: { type: Date, default: Date.now, required: true },
    updated_at: { type: Date, default: Date.now, required: true }
});

// アサインとステージの関係が正しいか
Issues.pre('save', function (next) {
    var stage = stageTypes[this.stage];
    if (!stage) { return next(); }

    if (stage.assigned && !this.assignee) {
        next(new Error('required to assign in ' + stage.name + ' stage.'));
    }
    if (!stage.assigned && this.assignee) {
        next(new Error('required to not assign in ' + stage.name + ' stage.'));
    }

    next();
});

if (!mongoose.models.Issue) { module.exports = mongoose.model('Issue', Issues); }
else { module.exports = mongoose.model('Issue'); }
