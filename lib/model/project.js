var string = require('../module/util/string');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var Issue = require('./issue');

var ID_LENGTH = 12;

var createID = string.createRandomCode.bind(string, ID_LENGTH);

var Projects = new Schema({
    id: { type: String, default: createID, required: true },
    name: { type: String, required: true },
    members: [
        {
            userId: { type: ObjectId, ref: 'User', required: true }, // user id
            created_at: { type: Date, default: Date.now, required: true },
            accessLevel: { type: String, default: 1, required: true }
        }
    ],
    issues: [Issue.schema],
    github: {  // option
        userName: { type: String },
        repoName: { type: String },
        url: { type: String }
    },
    created_at: { type: Date, default: Date.now, required: true }
});

module.exports = mongoose.model('Project', Projects);