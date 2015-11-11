var User = require('../user');

module.exports = GitHubHook;

function GitHubHook(token) {
    var GitHub = require('../github'); // 先頭で読み込むと依存関係でエラー...
    this.api = new GitHub(token);
}

GitHubHook.isHooked = function (project) {
    return project.github && project.github.sync;
};

GitHubHook.prototype.addIssue = function (project, params, callback) {
    this.api.createIssue(project.github.repoName, project.github.userName, params, callback);
};

GitHubHook.prototype.removeIssue = function (project, params, callback) {
    this.api.closeIssue(project.github.repoName, project.github.userName, params.issue, callback);
};

GitHubHook.prototype.assignIssue = function (project, params, callback) {
    var api = this.api;
    if (params.userId) {
        User.findById(params.userId, function (err, user) {
            if (err) { return callback(err); }
            api.assignIssue(project.github.repoName, project.github.userName, params.issue, user.userName, callback);
        });
    } else {
        api.assignIssue(project.github.repoName, project.github.userName, params.issue, null, callback);
    }
};

GitHubHook.prototype.updateDetailIssue = function (project, params, callback) {
    this.api.updateDetailIssue(project.github.repoName, project.github.userName, params.issue, params.detail, callback);
};

GitHubHook.prototype.addLabel = function (project, params, callback) {
    this.api.addLabel(project.github.repoName, project.github.userName, params, callback);
};

GitHubHook.prototype.removeLabel = function (project, params, callback) {
    this.api.removeLabel(project.github.repoName, project.github.userName, params, callback);
};

GitHubHook.prototype.updateState = function (project, params, callback) {
    this.api.updateDetailIssue(project.github.repoName, project.github.userName, params.issue, {state: params.state}, callback);
};

GitHubHook.prototype.attachLabel = function (project, params, callback) {
    this.api.attachLabel(project.github.repoName, project.github.userName, params.issue, params.label, callback);
};

GitHubHook.prototype.detachLabel = function (project, params, callback) {
    this.api.detachLabel(project.github.repoName, project.github.userName, params.issue, params.label, callback);
};