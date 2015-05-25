module.exports = {
    headers: {
        'X-Github-Event': 'issues'
    },
    body: {
        "action": "closed",
        "issue": { // issue
            "url": "https://api.github.com/repos/test_user/test_project/issues/2",
            "id": 73464126,
            "number": 2,
            "title": "test title",
            "user": {
                "login": "test_user",
            },
            "state": "open",
            "locked": false,
            "assignee": null,
            "milestone": null,
            "created_at": "2015-05-05T23:40:28Z",
            "updated_at": "2015-05-05T23:40:28Z",
            "closed_at": null,
            "body": "test body"
        },
        "repository": { // repo
            "id": 35129377,
            "name": "test_project",
            "full_name": "test_user/test_projecto",
            "owner": {
                "login": "test_user"
            }
        },
        "sender": { // User
        }
    }
};