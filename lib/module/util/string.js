var _ = require('underscore');

module.exports = {
    createRandomCode: function (length) {
        var chars = [].concat(
            this.lowerList(),
            this.upperList(),
            this.numList());

        return _.sample(chars, length).join('');
    },

    lowerList: function () {
        var c = 'a'.charCodeAt(0);

        return _.map(_.range(0, 26), function (x) {
            return String.fromCharCode(c + x);
        });
    },

    upperList: function () {
        var c = 'A'.charCodeAt(0);

        return _.map(_.range(0, 26), function (x) {
            return String.fromCharCode(c + x);
        });
    },

    numList: function () {
        var c = '0'.charCodeAt(0);

        return _.map(_.range(0, 10), function (x) {
            return String.fromCharCode(c + x);
        });
    }
};