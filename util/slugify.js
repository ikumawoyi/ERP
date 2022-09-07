/**
 * Created by toluogunremi on 3/12/15.
 */
'use strict';

exports = module.exports = function(text) {
    return text.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
};
