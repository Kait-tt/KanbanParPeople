var assert = require('assert');
var should = require('should');

var asyncQueue = require('../../module/asyncQueue.js');

describe('module', function () {
    describe('util', function () {
        describe('asyncQueue', function () {
            describe('add three queue', function () {
                var res = [];
                var funcs = [
                    function (done) { res.push(1); done(); },
                    function (done) { res.push(2); done(); },
                    function (done) { res.push(3); done(); }
                ];
                var queueName = 'hoge';

                before(function (done) {
                    funcs.forEach(function (func) {
                        asyncQueue.push(queueName, func);
                    });
                    setTimeout(done, 100);
                });

                it('should order by 1 2 3', function () { should(res).eql([1,2,3]); });
            });

            describe('add three queue with setTimeout', function () {
                var res = [];
                var funcs = [
                    function (done) {
                        setTimeout(function () {
                            res.push(1); done();
                        }, 60);
                    },
                    function (done) {
                        setTimeout(function () {
                            res.push(2); done();
                        }, 10);
                    },
                    function (done) {
                        setTimeout(function () {
                            res.push(3); done();
                        }, 30);
                    }
                ];
                var queueName = 'hoge';

                before(function (done) {
                    funcs.forEach(function (func) {
                        asyncQueue.push(queueName, func);
                    });
                    setTimeout(done, 200);
                });

                it('should order by 2 3 1', function () { should(res).eql([2,3,1]); });
            });
        });
    });
});