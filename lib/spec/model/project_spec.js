var should = require('should');
var db = require('../helper/db');
var Project = require('../../model/project');
var User = require('../../model/user');
var ew = require('../../module/util/asyncWrap').errorWrap.bind(null, function (err) { console.error(err); throw new Error(err); });
var _ = require('lodash');
var userParams = require('../fixture/user');
var stages = require('../../model/stages');
var monky = require('../factory/setup').monky;
var setup = require('../factory/setup').setup;

describe('model', function () {
    describe('project', function () {
        var adminUser;
        var project;
        var issue;
        var issues;
        var member;
        var label;
        var labels;

        before(db.before);
        after(db.after);

        beforeEach(function (done) {
            setup(ew(function (docs) {
                adminUser = docs.user;
                project = docs.project;
                issue = docs.issueParams;
                issues = docs.issues;
                member = docs.userParams;
                label = docs.label;
                labels = docs.labels;
                done();
            }));
        });

        function reFindProject(callback) {
            Project.findOne({name: project.name}, ew(function (doc) {
                project = doc;
                callback();
            }));
        }

        it('インスタンスを作れる', function () {
            var project = new Project();
            project.should.is.instanceof(Project);
            project.created_at.should.is.instanceof(Date);
        });

        describe('create', function () {
            var projectParams;

            beforeEach(function (done) {
                monky.build('Project', {create_user: adminUser._id}, ew(function (doc) {
                    projectParams = doc;
                    Project.create(projectParams, ew(function (doc) {
                        project = doc;
                        done();
                    }));
                }));
            });

            it('指定した名前のプロジェクトが作られている', function () {
                project.name.should.be.equal(projectParams.name);
            });
        });

        describe('exists', function () {
            var isExists;

            describe('with 存在するプロジェクト名', function () {
                beforeEach(function (done) {
                    Project.exists({name: project.name}, ew(function (res) {
                        isExists = res;
                        done();
                    }));
                });

                it('trueが返る', function () { isExists.should.be.equal(true); });
            });

            describe('with 存在しないプロジェクト名', function () {
                beforeEach(function (done) {
                    Project.exists({name: 'hogeeeeeeeeeeeeeeeeeeee'}, ew(function (res) {
                        isExists = res;
                        done();
                    }));
                });

                it('存在しないのでfalseが返る', function () { isExists.should.be.equal(false); });
            });
        });

        describe('issue', function () {
            var beforeIssueLength;

            beforeEach(function () {
                beforeIssueLength = project.issues.length;
            });

            describe('addIssue', function () {
                beforeEach(function (done) {
                    project.addIssue(null, issue, ew(function () { reFindProject(done); }));
                });

                it('Issueが1つ増えている', function () {
                    should(project.issues.length - beforeIssueLength).be.equal(1);
                });
            });

            describe('removeIssue', function () {
                beforeEach(function (done) {
                    project.removeIssue(null, issues[0]._id, ew(function () { reFindProject(done); }));
                });

                it('Issueの数は変わっていない', function () { should(project.issues.length).be.equal(beforeIssueLength); });
                it('IssueのStageがArchiveになっている', function () { should(project.issues[0].stage).be.equal(stages.archive); });
            });
        });

        describe('member', function () {
            var beforeMemberLength;

            beforeEach(function () {
                beforeMemberLength = project.members.length;
            });

            describe('addMember', function () {
                beforeEach(function (done) {
                    project.addMember(member.userName, ew(function () {
                        reFindProject(done);
                    }));
                });

                it('メンバーが1人増えている', function () {
                    should(project.members.length - beforeMemberLength).be.equal(1);
                });
            });

            describe('removeMember', function () {
                beforeEach(function (done) {
                    project.removeMember(adminUser.userName, ew(function () { reFindProject(done); }));
                });

                it('メンバーが1人減っている', function () { should(project.members.length - beforeMemberLength).be.equal(-1); });
            });
        });

        describe('update member order', function () {
            var beforeMemberNames;
            var afterMemberNames;

            beforeEach(function () {
                beforeMemberNames = project.members.map(function (member) { return member.user.userName; });
            });

            describe('with second to first', function () {
                beforeEach(function (done) {
                    project.updateMemberOrder(beforeMemberNames[1], beforeMemberNames[0], ew(function (_project) {
                        afterMemberNames = _project.members.map(function (member) { return member.user.userName; });
                        done();
                    }));
                });

                it('first expected to be old second', function () { should(afterMemberNames[0]).be.eql(beforeMemberNames[1]); });
                it('second expected to be old first', function () { should(afterMemberNames[1]).be.eql(beforeMemberNames[0]); });
                it('third expected to be old third', function () { should(afterMemberNames[2]).be.eql(beforeMemberNames[2]); });
            });

            describe('with first to third', function () {
                beforeEach(function (done) {
                    project.updateMemberOrder(beforeMemberNames[0], null, ew(function (_project) {
                        afterMemberNames = _project.members.map(function (member) { return member.user.userName; });
                        done();
                    }));
                });

                it('first expected to be old second', function () { should(afterMemberNames[0]).be.eql(beforeMemberNames[1]); });
                it('second expected to be old third', function () { should(afterMemberNames[1]).be.eql(beforeMemberNames[2]); });
                it('third expected to be old first', function () { should(afterMemberNames[2]).be.eql(beforeMemberNames[0]); });
            });

            describe('with third to first', function () {
                beforeEach(function (done) {
                    project.updateMemberOrder(beforeMemberNames[2], beforeMemberNames[0], ew(function (_project) {
                        afterMemberNames = _project.members.map(function (member) { return member.user.userName; });
                        done();
                    }));
                });

                it('first expected to be old third', function () { should(afterMemberNames[0]).be.eql(beforeMemberNames[2]); });
                it('second expected to be old first', function () { should(afterMemberNames[1]).be.eql(beforeMemberNames[0]); });
                it('third expected to be old second', function () { should(afterMemberNames[2]).be.eql(beforeMemberNames[1]); });
            });

            describe('with second to first', function () {
                beforeEach(function (done) {
                    project.members.pop();
                    project.save(function (err, _project) {
                        if (err) { throw new Error(err); }
                        project = _project;
                        beforeMemberNames = project.members.map(function (member) { return member.user.userName; });
                        project.updateMemberOrder(beforeMemberNames[1], beforeMemberNames[0], ew(function (_project) {
                            afterMemberNames = _project.members.map(function (member) { return member.user.userName; });
                            done();
                        }));
                    });
                });

                it('first expected to be old second', function () { should(afterMemberNames[0]).be.eql(beforeMemberNames[1]); });
                it('second expected to be old first', function () { should(afterMemberNames[1]).be.eql(beforeMemberNames[0]); });
            });
        });

        describe('update issue', function () {
            function wrap(stage, assign, isValid) {
                var params = {};
                var issue;
                var error;

                describe('with ' + (assign ? 'assign' : 'no assign') + ' and change stage to ' + stage, function () {
                    beforeEach(function (done) {
                        params = {stage: stage, userId: assign ? adminUser._id : null};

                        project.updateStage(null, issues[0]._id, params.stage, params.userId, function (err) {
                            error = err;
                            if (!err) {
                                reFindProject(function () {
                                    issue = project.issues[0];
                                    done();
                                });
                            } else {
                                done();
                            }
                        });
                    });

                    if (isValid) {
                        it('expected not to be error', function () { should.not.exists(error); });
                        it('valid stage', function () { issue.stage.should.be.equal(params.stage); });
                        it('valid assignee', function () { String(issue.assignee).should.be.equal(String(params.userId)); });
                    } else {
                        it('expected to be error', function () { should.exists(error); });
                    }
                });
            }

            wrap(stages.todo, true, true);
            wrap(stages.todo, false, false);
            wrap(stages.done, true, false);
            wrap(stages.done, false, true);
        });

        describe('update priority', function () {
            describe('with moving first to before third (i.e. swapping first for second)', function () {
                var oldIssueTitles;
                beforeEach(function (done) {
                    oldIssueTitles = _.pluck(project.issues, 'title');
                    project.updateIssuePriority(project.issues[0]._id, project.issues[2]._id, ew(function () { reFindProject(done); }));
                });

                it('first issue expected to be old second', function () { should(project.issues[0].title).be.eql(oldIssueTitles[1]); });
                it('second issue expected to be old first', function () { should(project.issues[1].title).be.eql(oldIssueTitles[0]); });
                it('third issue expected to be old third', function () { should(project.issues[2].title).be.eql(oldIssueTitles[2]); });
            });

            describe('with moving first to last (i.e. rotate left)', function () {
                var oldIssueTitles;
                beforeEach(function (done) {
                    oldIssueTitles = _.pluck(project.issues, 'title');
                    project.updateIssuePriority(project.issues[0]._id, null, ew(function () { reFindProject(done); }));
                });

                it('first issue expected to be old second', function () { should(project.issues[0].title).be.eql(oldIssueTitles[1]); });
                it('second issue expected to be old third', function () { should(project.issues[1].title).be.eql(oldIssueTitles[2]); });
                it('third issue expected to be old first', function () { should(project.issues[2].title).be.eql(oldIssueTitles[0]); });
            });

            describe('with moving third to first (i.e. rotate right)', function () {
                var oldIssueTitles;
                beforeEach(function (done) {
                    oldIssueTitles = _.pluck(project.issues, 'title');
                    project.updateIssuePriority(project.issues[2]._id, project.issues[0]._id, ew(function () { reFindProject(done); }));
                });

                it('first issue expected to be old third', function () { should(project.issues[0].title).be.eql(oldIssueTitles[2]); });
                it('second issue expected to be old first', function () { should(project.issues[1].title).be.eql(oldIssueTitles[0]); });
                it('third issue expected to be old second', function () { should(project.issues[2].title).be.eql(oldIssueTitles[1]); });
            });
        });

        describe('label', function () {
            describe('#addLabel', function () {
                var oldLabelNames;

                beforeEach(function (done) {
                    oldLabelNames = _.pluck(project.labels, 'name');
                    project.addLabel(null, label, ew(function () { reFindProject(done); }));
                });

                it('length is increased by 1', function () { should(project.labels.length - oldLabelNames.length).be.equal(1); });
                it('project contains added label', function () { should(_.pluck(project.labels, 'name')).containEql(label.name); });
                it('last item is added label', function () { should(project.labels.pop().name).be.equal(label.name); });

                describe('add label which is duplicated name', function () {
                    var err;
                    beforeEach(function (done) {
                        project.addLabel(null, {name: label.name, color: label.color}, function (_err) {
                            err = _err;
                            done();
                        });
                    });

                    it('deny', function () { should.exist(err); });
                });
            });

            describe('#removeLabel', function () {
                var oldLabelNames;
                var lastLabel;

                beforeEach(function (done) {
                    oldLabelNames = _.pluck(project.labels, 'name');
                    lastLabel = project.labels[project.labels.length - 1];
                    project.removeLabel(null, lastLabel.name, ew(function () { reFindProject(done); }));
                });

                it('length is decreased by 1', function () { should(project.labels.length - oldLabelNames.length).be.equal(-1); });
                it('project do not contains removed label', function () { should(_.pluck(project.labels, 'name')).not.containEql(lastLabel.name); });
            });

            describe('#attachLabel', function () {
                describe('attach one label', function () {
                   beforeEach(function (done) {
                       project.attachLabel(null, project.issues[0]._id, project.labels[0].name,
                           ew(function () { reFindProject(done);}));
                   });

                    it('the issue has a label', function () { should(project.issues[0].labels.length).be.equal(1); });
                    it('issue\'s label is attached label', function () {
                        should(project.issues[0].labels[0]).be.eql(project.labels[0]._id);
                    });
                });

                describe('attach two label', function () {
                    beforeEach(function (done) {
                        project.attachLabel(null, project.issues[0]._id, project.labels[0].name, ew(function (project) {
                            project.attachLabel(null, project.issues[0]._id, project.labels[1].name,
                                ew(function () { reFindProject(done); }));
                        }));
                    });

                    it('the issue has two labels', function () { should(project.issues[0].labels.length).be.equal(2); });
                    it('issue\'s label is attached label', function () {
                        should(project.issues[0].labels[0]).be.eql(project.labels[0]._id);
                        should(project.issues[0].labels[1]).be.eql(project.labels[1]._id);
                    });
                });

                describe('attach invalid label', function () {
                    var err;

                    beforeEach(function (done) {
                        project.attachLabel(null, project.issues[0]._id, '______invalid______', function (_err) {
                            err = _err;
                            done();
                        });
                    });

                    it('exists error', function () { should.exists(err); });
                });
            });

            describe('#detachLabel', function () {
                // issue_0にlabel_0, label_1を持たせておく
                beforeEach(function (done) {
                    project.attachLabel(null, project.issues[0]._id, project.labels[0].name, ew(function (project) {
                        project.attachLabel(null, project.issues[0]._id, project.labels[1].name,
                            ew(function () { reFindProject(done); }));
                    }));
                });

                // lavel_0を取り除く
                describe('detach a label', function () {
                    var beforeIssueLabelsLength;
                    beforeEach(function (done) {
                        beforeIssueLabelsLength = project.issues[0].labels.length;
                        project.detachLabel(null, project.issues[0]._id, project.labels[0].name,
                            ew(function () { reFindProject(done); }));
                    });

                    it('the issue\'s label length is decreased by 1', function () {
                        should(beforeIssueLabelsLength - project.issues[0].labels.length).be.equal(1);
                    });
                    it('the issue have old second label', function () {
                        should(project.issues[0].labels[0]).be.eql(project.labels[1]._id);
                    });
                });
            });
        });
    });
});