var should = require('should');
var db = require('../helper/db');
var Project = require('../../model/project');
var User = require('../../model/user');
var ew = require('../../module/util/asyncWrap').errorWrap.bind(null, function (err) { throw new Error(err); });
var projectParams = require('../fixture/project');
var userParams = require('../fixture/user');
var GitHubHook = require('../../model/hook/github');

describe('model', function () {
    describe('project with github', function () {
        var createUser;
        var project;
        var token = 'hogehoge';

        before(db.before);
        after(db.after);

        beforeEach(function (done) {
            User.create({userName: userParams.userName}, ew(function (doc) {
                createUser = doc;
                done();
            }));
        });

        describe('create', function () {
            beforeEach(function (done) {
                projectParams.create_user = createUser;
                Project.create(projectParams, ew(function (doc) {
                    project = doc;
                    done();
                }));
            });

            it('指定した名前のプロジェクトが作られている', function () { project.name.should.be.equal(projectParams.name); });
            it('github syncが有効になっている', function () { project.github.sync.should.be.equal(true); });

            describe('addIssue', function () {
                var taskParams = { title: 'hoge' };
                var reqs;
                var _done;

                beforeEach(function (done) {
                    // spy
                    GitHubHook.prototype.addIssue = function (_project, _params, callback) {
                        reqs = arguments;
                        callback();
                        done();
                    };

                    project.addIssue(token, taskParams, ew(function () {
                        setTimeout(done, 500);
                    }));
                });

                it('第1引数にprojectが渡されている', function () { should(reqs[0]).be.equal(project); });
                it('第2引数にparamsが渡されている', function () { should(reqs[1]).be.equal(taskParams); });
            });
        });
    });
});