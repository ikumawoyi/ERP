/**
 * Created by toluogunremi on 3/12/15.
 */
'use strict';

exports.http404 = function(req, res){
    res.status(404);
        res.send({ error: 'Resource not found.' });
};

exports.http500 = function(err, req, res, next){
    res.status(500);

    var data = { err: {} };
    if (req.app.get('env') === 'development') {
        data.err = err;
        console.log(err.stack);
    }
    res.send({ error: 'Something went wrong.', details: data });
};
