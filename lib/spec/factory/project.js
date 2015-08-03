var monky = require('../factory/setup').monky;

monky.factory('Project', {
    name: 'project #n',
    create_user: null, // require replace value
    members: [],
    issues: [],
    github: {
        userName: 'github user name',
        repoName: 'github repo name',
        url: 'github url',
        sync: 'true'
    }
});

