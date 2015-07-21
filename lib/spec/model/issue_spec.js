var should = require('should');
var db = require('../helper/db');
var Issue = require('../../model/issue');
var stages = require('../../model/stages');
var User = require('../../model/user');

describe('model', function () {
    describe('issue', function () {
        before(db.before);

        after(db.after);

        it('インスタンスを作れるか', function () {
            var issue = new Issue();
            issue.should.is.instanceof(Issue);
            issue.created_at.should.is.instanceof(Date);
        });

        it('Issueを作ってみる', function (done) {
            var title = 'IssueA';
            Issue.create({title: title}, function (err, issue) {
                if (err) { throw new Error(err); }
                issue.title.should.be.equal(title);
                done();
            });
        });

        describe('stage and assignee validation', function () {
            var user;
            var issueTitle = 'hoge';

            before(function (done) {
                User.findOrCreate('user', function (err, doc) {
                    if (err) { throw err; }
                    user = doc;
                    done();
                });
            });

            it('アサインすればステージをTODOにできる', function (done) {
                Issue.create({title: issueTitle, stage: stages.todo, assignee: user}, function (err, issue) {
                    should.not.exist(err);
                    should.exist(issue);
                    done();
                });
            });

            it('アサインせずにステージをTODOにできない', function (done) {
                Issue.create({title: issueTitle, stage: stages.todo, assignee: null}, function (err, issue) {
                    should.exist(err);
                    done();
                });
            });

            it('アサインしなければDoneにできる', function (done) {
                Issue.create({title: issueTitle, stage: stages.done, assignee: null}, function (err, issue) {
                    should.not.exist(err);
                    should.exist(issue);
                    done();
                });
            });

            it('アサインされたままDoneにできない', function (done) {
                Issue.create({title: issueTitle, stage: stages.done, assignee: user}, function (err, issue) {
                    should.exist(err);
                    done();
                });
            });
        });
    });
});