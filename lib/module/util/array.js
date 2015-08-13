module.exports = {
    moveToBefore: function (ary, target, beforeOf) {
        // remove
        ary.splice(ary.indexOf(target), 1);

        // insert
        if (!beforeOf) {
            ary.push(target);
        } else {
            ary.splice(ary.indexOf(beforeOf), 0, target);
        }

        return ary;
    }
};