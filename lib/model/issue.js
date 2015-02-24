var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Issues = new Schema({
    created_at: { type: Date, default: Date.now, required: true }
});

module.exports = mongoose.model('Issue', Issues);