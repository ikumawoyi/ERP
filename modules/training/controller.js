

//#region Training

exports.getTrainings = function (req, res) {
    var us = require('underscore');
    var today = new Date(new Date().toDateString());
    req.app.db.models.Training.find()
    .populate('invited', 'firstName lastName department').exec(function (er, trns) {
        if (er) res.status(500).send({ message: 'Could not retreive trainings', err: er });
        else if (trns.length == 0) res.json(trns);
        else {
            req.app.db.models.Organisation.populate(trns, { path: 'invited.department', select: 'name' }, function () {
                res.json({
                    past: us.filter(trns, function (o) { return today > o.date; }),
                    pending: us.filter(trns, function (o) { return today <= o.date; })
                });
            });
        }
    });
};

exports.saveTraining = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var data = req.body; var t = [];
        ['date', 'start', 'end', 'title', 'invited']
            .forEach(function (i) {
                if (!data[i]) t.push(req.app.kenna.utility.capitalize(i));
            });
        if (t.length > 0) {
            workflow.outcome.errors.push('The ' + t + 'field' + (t.length > 1 ? 's are ' : ' is') + ' required.');
            return workflow.emit('response');
        }
        if (Array.isArray(data.invited) && data.invited.length > 0) {
            delete data.scores; delete data.attendees;

            return workflow.emit('saveTraining', data);
        } else {
            workflow.outcome.errors.push('The invited employees for the training cannot be empty.');
            return workflow.emit('response');
        }

    });
    workflow.on('saveTraining', function (training) {
        training.end = req.app.kenna.utility.getTime(training.end); training.start = req.app.kenna.utility.getTime(training.start);
        req.app.db.models.Training.create(training, function (er, tr) {
            if (er) {
                workflow.outcome.errors.push('An error occurred while saving training data.');
                return workflow.emit('response');
            }
            else {
                req.app.utility.notify.emit('trainingSetup', tr, req.user);
                workflow.outcome.success = true;
                workflow.outcome.message = 'The training has been successfully setup for ' + tr.date.toDateString();
                workflow.emit('response');
            }
        });
    });
    workflow.emit('validate');
};

exports.submitTrainingScore = function (req, res) {
    var data = req.body;
    res.json({ success: false, message: 'Score upload could not be completed.' });
};
//#endregion 
