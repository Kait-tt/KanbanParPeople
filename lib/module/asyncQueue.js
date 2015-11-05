var _ = require('lodash');

module.exports = {
    push: push,
    wait: 10 // ms
};

var queue = {};
var isRunning = {};

function push(name, func) {
    if (!queue[name]) {
        queue[name] = [];
    }

    queue[name].push(func);

    if (!isRunning[name]) {
        run(name);
    }
}

function process(name) {
    if (!queue[name] || queue[name].length === 0) {
        isRunning[name] = false;
        return;
    } else {
        isRunning[name] = true;
    }

    var func = queue[name].shift();
    if (!_.isFunction(func)) {
        return run(name);
    }

    if (func.length === 0) {
        func();
        run(name);
    } else {
        func(function () {
            run(name);
        });
    }

}

function run(name) {
    setTimeout(function () {
        process(name);
    }, module.exports.wait);
}
