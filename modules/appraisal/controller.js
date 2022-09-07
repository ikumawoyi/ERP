
exports.initiateAppraisalPeriod = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var period = req.body;
        var date = new Date(); var y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
        ['name', 'start', 'end']
            .forEach(function (item) {
                if (!period[item])
                    workflow.outcome.errfor[item] = 'required';
            });
        period.year = y;
        if (workflow.hasErrors()) {
            workflow.outcome.errors.push('Please ensure that all required fields are entered.');
            return workflow.emit('response');
        }
        else {
            //period.year = new Date().getFullYear();
            switch (m) {
                case 0, 1, 2:
                    break;
                case 3, 4, 5:
                    break;
                case 6, 7, 8:
                    break;
                case 9, 10, 11:
                    break;
            }
            workflow.period = period;
            workflow.emit('checkAndCreate');
        }
    });
    workflow.on('checkAndCreate', function () {
        req.app.db.models.AppraisalPeriod.findOne({ name: workflow.period.name, year: workflow.period.year },
            function (err, exp) {
                if (err) { return workflow.emit('exception', err); }
                else if (exp) {
                    workflow.outcome.errors.push('There is an existing period of appraisal, appraisals can only be initiated when current has expired.');
                    return workflow.emit('response');
                } else
                    req.app.db.models.AppraisalPeriod.create(workflow.period, function (err, exp) {
                        if (err) { return workflow.emit('exception', err); }
                        else {
                            workflow.outcome.item = exp;
                            workflow.outcome.success = true;
                            workflow.outcome.message = 'Appraisal period successfully initiated';
                            req.app.utility.appraisal.emit('appraisalInitiated', exp);
                            workflow.emit('response');
                        }
                    });
            });
    });
    workflow.emit('validate');
};
exports.extendAppraisalPeriod = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var period = req.body;
        ['_id', 'name', 'newEnd']
            .forEach(function (item) {
                if (!period[item])
                    workflow.outcome.errfor[item] = 'required';
            });
        if (workflow.hasErrors()) {
            workflow.outcome.errors.push('Please ensure that all required fields are entered.');
            return workflow.emit('response');
        }
        else { workflow.period = period; workflow.emit('checkAndUpdate'); }
    });
    workflow.on('checkAndUpdate', function () {
        req.app.db.models.AppraisalPeriod.findById(workflow.period._id, function (err, per) {
            if (err) return workflow.emit('exception', err);
            else if (!per) {
                workflow.outcome.errors.push('Appraisal Period does not exist.');
                return workflow.emit('response');
            } else {
                var extDate = new Date(workflow.period.newEnd); req.app.kenna.utility.resetTime(extDate);
                var date = new Date(); var y = date.getFullYear(), m = date.getMonth(), d = date.getDate(); date = new Date(y, m, d);
                if (extDate < new Date(per.end) || extDate < date) { workflow.outcome.errors.push('The date provided is not valid.'); return workflow.emit('response'); }
                else {
                    var old = per.end; per.end = extDate; per.isExtended = true;
                    per.save(function (er, pe) {
                        if (er) return workflow.emit('exception', err);
                        else {
                            workflow.outcome.item = pe;
                            workflow.outcome.success = true;
                            workflow.outcome.message = 'Appraisal period has been successfully extended';
                            workflow.emit('notifyOnExtension', pe, old);
                            workflow.emit('response');
                        }
                    });
                }
            }
        });
    });
    workflow.emit('validate');
};
exports.currentPeriod = function (req, res) {
    //req.app.kenna.utility.getCurrentPeriod(
    //    req.app.db.models.AppraisalPeriod,
    //    function(err,period) {
    //        if(err) res.status(404).send(err);
    //        else res.json(period);
    //    });
    req.app.db.models.AppraisalPeriod.find(function (err, pers) {
        if (err) res.status(500).send('Could not retrieve the appraisal period status.');
        else if (pers.length == 0) res.status(404).send('no Appraisal period found.');
        else {
            var per = pers[pers.length - 1];
            res.json(per);
        }
    });
};