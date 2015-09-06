require('../../model/issue');
var monky = require('../factory/setup').monky;

monky.factory('Issue', {
    title: 'issue #n',
    body: 'body #n',
    github: {number: 2}
});

