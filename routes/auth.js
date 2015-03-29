var express = require('express');
var User = require('../lib/model/user');

module.exports = function (passport) {
    var router = express.Router();

    router.ensureAuthenticated = function (req, res, next) {
        if (req.isAuthenticated()) { return next(); }
        res.redirect('/?mustlogin=1');
    };

    router.notEnsureAuthenticated = function (req, res, next) {
        if (!req.isAuthenticated()) { return next(); }
        res.redirect('/');
    };

    router.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });

    router.get('/github', passport.authenticate('github'));

    router.get('/github/callback', passport.authenticate('github', {failureRedirect: '/?mustlogin=1'}),
        function (req, res, next) {
            User.findOrCreate(req.user.username, function (err) {
                if (err) {
                    console.log(err);
                    next(err);
                }
                res.redirect('/users/me');
            });
        });

    return router;
};
