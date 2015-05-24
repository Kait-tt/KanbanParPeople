process.env.NODE_ENV = 'test';

var config = require('config');
var mongoose = require('mongoose');

module.exports = {
    before: function (done) {
        mongoose.connect(config.get('mongo.url'), null, done);
    },

    after: function (done) {
        mongoose.connection.db.dropDatabase(function (err) {
            if (err) { throw new Error(err); }
            mongoose.disconnect(done);
        });
    }
};