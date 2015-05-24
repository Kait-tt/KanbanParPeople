var should = require('should');
var db = require('../helper/db');
var Issue = require('../../model/issue');

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
    });
});