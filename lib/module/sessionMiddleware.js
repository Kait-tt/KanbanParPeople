var session = require('express-session');
var mongo = require('connect-mongo');
var config = require('config');

module.exports = session({
    name: config.session.name,
    secret: config.session.secret,
    store: new (mongo(session))({
        url: config.mongo.url
    }),
    resave: true,
    saveUninitialized: false
});