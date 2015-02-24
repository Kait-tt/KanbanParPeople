var assert = require('assert');
var should = require('should');

var string = require('../../../module/util/string.js');

describe('module', function () {
    describe('util', function () {
        describe('string', function () {
            describe('#lowerList', function () {
                it('全ての小英字がそろっているか', function () {
                    string.lowerList().join('')
                        .should.is.exactly('abcdefghijklmnopqrstuvwxyz');
                });
            });

            describe('#upperList', function () {
                it('全ての大英字がそろっているか', function () {
                    string.upperList().join('')
                        .should.is.exactly('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
                });
            });

            describe('#numList', function () {
                it('全ての数字がそろっているか', function () {
                    string.numList().join('')
                        .should.is.exactly('0123456789');
                });
            });

            describe('#createRandomCode', function () {
                it('長さはあっているか', function () {
                    var length = 12;
                    var code = string.createRandomCode(length);

                    console.log('code:', code);
                    code.should.have.length(length);
                });

                it('カリー化できるか', function () {
                    var length = 8;
                    var createCode12
                        = string.createRandomCode.bind(string, length);
                    var code = createCode12();

                    console.log('code:', code);
                    code.should.have.length(length);
                });
            });
        });
    });
});