var session = require('express-session');
var mongo = require('connect-mongo');

module.exports = session({
    name: 'name',
    secret: 'secret',
    store: new (mongo(session))({
        url: 'mongodb://localhost/kpp'
    }),
    resave: true,
    saveUninitialized: false
});