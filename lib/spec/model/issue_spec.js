var should = require('should');
var mongoose = require('mongoose');

var Issue = require('../../model/issue');

describe('model', function () {
    describe('project', function () {
        before(function (done) {
            mongoose.connect('mongodb://localhost/kpp_test_model_issue', null, done);
        });

        after(function (done) {
            mongoose.connection.db.dropDatabase(function(err) {
                if (err) { throw new Error(err); }
                mongoose.disconnect(done);
            });
        });

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
    });
});