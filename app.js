var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;
var mongoose = require('mongoose');
var sessionMiddleware = require('./lib/module/sessionMiddleware');

var GITHUB_CLIENT_ID = process.env.KPP_GITHUB_CLIENT_ID;
var GITHUB_CLIENT_SECRET = process.env.KPP_GITHUB_CLIENT_SECRET;

// mongoose
mongoose.connect('mongodb://localhost/kpp');

// Passport session setup.
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

// Use the GitHubStrategy within Passport.
passport.use(new GitHubStrategy({
        clientID: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        callbackURL: 'http://127.0.0.1:3000/auth/github/callback',
        scope: ['user', 'repo']
    },
    function(accessToken, refreshToken, profile, done) {
        process.nextTick(function () {
            profile.token = accessToken;
            return done(null, profile);
        });
    }
));

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// routing
var routes = require('./routes/index');
var auth = require('./routes/auth')(passport);
var user = require('./routes/user');
var project = require('./routes/project');
var api = require('./routes/api');

app.use('/', routes);
app.use('/auth', auth);
app.use('/api', api);
app.use('/users', auth.ensureAuthenticated, user);
app.use('/users/:user/projects', auth.ensureAuthenticated, project);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
