var request = require('supertest');
var app = require('../../../app');
var agent =  request.agent(app);

describe('routes', function () {
    describe('index', function () {
        it('hoge', function (done) {
            agent
                .get('/')
                .expect(200)
                .end(done);
        });
    });
});