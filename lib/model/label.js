var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Labels = new Schema({
    name: { type: String, required: true },
    color: { type: String, maxlength: 6, required: true }, // e.g. 'f29513'
    created_at: { type: Date, default: Date.now, required: true },
    updated_at: { type: Date, default: Date.now, required: true }
});

if (!mongoose.models.Label) { module.exports = mongoose.model('Label', Labels); }
else { module.exports = mongoose.model('Label'); }
