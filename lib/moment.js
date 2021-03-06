const moment = require('moment');
const countdown = require('countdown');

const slice = [].slice;

// Give moment a countdown
moment.fn.countdown = function () {
    const other = arguments[0];
    const args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    return countdown.apply(null, [this.toDate(), moment(other).toDate()].concat(slice.call(args)));
};

module.exports = moment;
