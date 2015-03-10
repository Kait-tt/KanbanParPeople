var express = require('express');

module.exports = function (passport) {
    var router = express.Router();

    router.ensureAuthenticated = function (req, res, next) {
        if (req.isAuthenticated()) { return next(); }
        res.redirect('/auth/login');
    };

    router.notEnsureAuthenticated = function (req, res, next) {
        if (!req.isAuthenticated()) { return next(); }
        res.redirect('/');
    };

    router.get('/login', router.notEnsureAuthenticated, function (req, res) {
        res.render('login', {title: 'login | KanbanParPeople'});
    });

    router.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });

    router.get('/github', passport.authenticate('github'),
        function (req, res) {
            // The request will be redirected to GitHub for authentication, so this
            // function will not be called.
        });

    router.get('/github/callback', passport.authenticate('github', {failureRedirect: '/auth/login'}),
        function (req, res) {
            res.redirect('/users/me');
        });

    return router;
};
