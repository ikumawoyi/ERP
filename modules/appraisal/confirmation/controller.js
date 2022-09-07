
//#region Confirmation Appraisal
exports.getconfirmationAppraisal = function (req, res) {

    req.app.db.models.ConfirmationAppraisal.aggregate([
        //{
        //    $match: { $and: [{ scoreText: { $ne: undefined } }, { recommendation: { $ne: undefined } }] }
        //},
        {
            $group: {
                _id: "$employee",
                data: { $push: "$$ROOT" }
            }
        },
        {
            $project: {
                employee: "$_id",
                data: 1,
            }
        }, { $sort: { _id: 1 } }
    ], function (e, t) {
        req.app.db.models.Employee.populate(t, { path: 'data.appraiser', select: 'firstName lastName designation department employeeId' }, function (e, p) {
            req.app.db.models.Employee.populate(t, { path: 'employee', select: 'firstName lastName designation department employeeId' }, function (e, p) {
                req.app.db.models.Organisation.populate(t, { path: 'employee.department', select: 'name' }, function (e, p) {
                    res.json(t);
                });
            });
        });
    });
};
exports.getConfirmationArea = function (req, res) {
    req.app.db.models.ConfirmationArea.find()
            .populate('departments', 'name').exec(function (err, saq) {
                if (err) res.status(500).send('Could not retrieve confirmation appraisal areas');
                else res.json(saq);
            });
};
exports.saveConfirmationArea = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var assessment = req.body;
        if (assessment.delete) workflow.emit('delete', assessment._id);
        else {
            if (!assessment.area) workflow.outcome.errors.push('The confirmation area name/title is required.');
            if (workflow.hasErrors()) return workflow.emit('response');
            else if (assessment._id) workflow.emit('update', assessment);
            else workflow.emit('create', assessment);
        }
    });
    workflow.on('create', function (item) {
        req.app.db.models.ConfirmationArea.create(item, function (err, exp) {
            if (err) { workflow.outcome.errors.push('An error occurred while creating the record.'); return workflow.emit('exception', err); }
            else {
                workflow.outcome.item = exp;
                workflow.outcome.success = true;
                workflow.outcome.message = 'Confirmation evaluation area successfully added';
                workflow.emit('response');
            }
        });
    });
    workflow.on('update', function (item) {
        req.app.db.models.ConfirmationArea.findById(item._id, function (err, exp) {
            if (err) { workflow.outcome.errors.push('An error occurred while updating the record.'); return workflow.emit('exception', err); }
            else if (exp) {
                req.app.kenna.utility.populate(exp, item);
                exp.save(function (er, itm) {
                    if (err) { workflow.outcome.errors.push('An error occurred while updating the record.'); return workflow.emit('exception', err); }
                    else {
                        workflow.outcome.item = exp;
                        workflow.outcome.success = true;
                        workflow.outcome.message = 'Confirmation evaluation area successfully updated';
                        workflow.emit('response');
                    }
                })
            } else {
                workflow.outcome.errors.push('The selected evaluation area was not found.');
                return workflow.emit('response', err);
            }
        });
    });
    workflow.on('delete', function (id) {
        req.app.db.models.ConfirmationArea.findByIdAndRemove(id, function (err, exp) {
            if (err) { workflow.outcome.errors.push('An error occurred while deleting the record.'); return workflow.emit('exception', err); }
            else {
                workflow.outcome.item = exp;
                workflow.outcome.success = true;
                workflow.outcome.message = 'Confirmation evaluation area successfully deleted';
                workflow.emit('response');
            }
        });
    });
    workflow.emit('validate');
};
exports.getUnconfirmed = function (req, res) {
    var d = new Date(new Date() - 30 * 24 * 60 * 60 * 1000); //15552000000
    req.app.db.models.ConfirmationAppraisal.distinct('employee')
            .exec(function (er, app) {
                if (er) res.status(500).send('Could not retrieve confirmation evaluations.');
                else {
                    require('async').parallel([
                        function (cb) {
                            req.app.db.models.Employee.find({ $and: [{ hired: { $lte: d } }, { confirmed: undefined }, { _id: { $nin: app } }, {status: {$ne: 'Inactive'}}] }, 'firstName lastName designation department hired')
                                    .populate('department', 'name')
                                    .exec(function (err, emps) {
                                        if (err) cb(err); else cb(null, emps);
                                    });
                        }, function (cb) {
                            req.app.db.models.Employee.find({status: {$ne : 'Inactive'}},'firstName lastName department designation')
                                    .populate('department', 'name')
                                    .exec(function (err, emps) {
                                        if (err) cb(err); else cb(null, emps);
                                    });
                        }, function (cb) {
                            req.app.db.models.Employee.find({ _id: { $in: app }, status: {$ne : 'Inactive' }}, 'firstName lastName department designation hired')
                                    .populate('department', 'name')
                                    .exec(function (err, emps) {
                                        if (err) cb(err); else cb(null, emps);
                                    });
                        }], function (er, results) {
                        if (er) res.status(500).end(er);
                        else res.json({ unconfirmed: results[0], emps: results[1], initiated: results[2] });
                    });
                };
            });
}
exports.initiateConfirmation = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var data = req.body;
        if (!(data || {})._id) {
            workflow.outcome.errors.push('No Employee was selected, please an employee for confirmation.');
            return workflow.emit('response');
        } else if (!data.appraisers || !data.appraisers.length) {
            workflow.outcome.errors.push('No Employee(s) selected to perform the evaluation.');
            return workflow.emit('response');
        } else workflow.emit('checkEmployeeAndIntiate', data);
    });
    workflow.on('checkEmployeeAndIntiate', function (data) {
        req.app.db.models.Employee.findById(data._id,
                'firstName lastName department designation', function (er, emp) {
                    if (!emp) {
                        workflow.outcome.errors.push(er ? 'An error occurred while retrieving selected employee information.' : 'The selected employee was not found.');
                        return workflow.emit('response');
                    } else {
                        req.app.db.models.ConfirmationAppraisal.find({ employee: emp.id }, function (er, app) {
                            if (er) {
                                workflow.outcome.errors.push('An error occurred while retrieving selected employee confirmation.');
                                return workflow.emit('response');
                            }
                            else if (app.length > 0) {
                                var hasOpen = false;
                                app.forEach(function (i) { if (!(i.recommendation || r.score || r.scoreText)) hasOpen = true; });
                                workflow.outcome.errors.push('Confirmation already exist for employee.');
                                return workflow.emit('response');
                            } else {
                                req.app.utility.appraisal.once('confirmationRequestCompleted', function (err) {
                                    res.json({ success: true, message: 'Confirmation evaluation for ' + emp.fullName() + ' was successfully setup.' });
                                });
                                req.app.utility.appraisal.emit('confirmationInitiated', emp, data.appraisers);
                            }
                        });
                    }
                });
    });
    workflow.emit('validate');
};
exports.getAssignedConfirmation = function (req, res) {
    req.app.db.models.ConfirmationAppraisal.find({ appraiser: req.user.employee.id, $or: [{ scoreText: undefined }, { recommendation: '' }] },
            '-details.score -recommendation -appraiser -score')
            .populate('employee', 'firstName lastName designation department employeeId')
            .exec(function (er, app) {
                if (er) res.status(500).send('Could not retrieve confirmation evaluations.');
                else {
                    req.app.db.models.Organisation.populate(app, { path: 'employee.department', select: 'name' },
                            function () { res.json(app); });
                };
            });
};
exports.performConfirmationEvaluation = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var evaluation = req.body;
        var hasErr = false, wrongScore = false;
        for (var t in evaluation.details) {
            if (!evaluation.details[t].scoreText)
                hasErr = true;
            else if (["Exceptional", "Excellent", "Very Good", "Good", "Satisfactory"].indexOf(evaluation.details[t].scoreText) == -1) wrongScore = true;
        }
        if (hasErr) {
            workflow.outcome.errors.push('Please complete the form and submit again');
            return workflow.emit('response');
        } else if (wrongScore) {
            workflow.outcome.errors.push('Submitted value contain unacceptable data');
            return workflow.emit('response');
        } else if (!evaluation.recommendation || ['Confirm', 'Deny'].indexOf(evaluation.recommendation) == -1) {
            workflow.outcome.errors.push('No recommendation found, please deny/accept the confirmation.');
            return workflow.emit('response');
        } else if (!evaluation.reason) {
            workflow.outcome.errors.push('No recommendation justification found, please justify.');
            return workflow.emit('response');
        } else workflow.emit('saveData', evaluation);
    });
    workflow.on('saveData', function (data) {
        var scores = []; var error = false; var errcol = [];
        for (var t in data.details) scores.push(data.details[t].scoreText);
        var t = req.app.kenna.utility.calculateArrayScore(scores); data.scoreText = t.text; data.score = t.score;
        data.date = new Date(new Date().toDateString());
        req.app.db.models.ConfirmationAppraisal
                .findByIdAndUpdate(data._id, { details: data.details, score: data.score, scoreText: data.scoreText, date: data.date, recommendation: data.recommendation, reason: data.reason })
                .exec(function (er, ev) {
                    if (!er && ev) {
                        workflow.outcome.success = true;
                        workflow.outcome.item = {
                            appraised: true, isOpen: true, message: 'Your evaluation was successfully processed'
                        };
                        workflow.outcome.message = "Your evaluation was successfully processed."
                        workflow.emit('response');
                    } else {
                        workflow.outcome.errors.push(er ? 'Could not process the inputted data' : 'Confirmation Evaluation was not found');
                        return workflow.emit('response');
                    }
                });
    });
    workflow.emit('validate');
};
exports.printConfirmation = function(req, res){
    if(req.params.id){
        req.app.db.models.ConfirmationAppraisal.findById(req.params.id).populate('appraiser employee','firstName lastName designation department employeeId' )
                .exec(function(e,d){
                    if(d) d.employee.populate('department', 'name', function(){
                            res.render('printconfirmation', {data: d});
                        });
                    else res.json({message: 'An error occured', err: e, d: d});
                })
    }else {console.log('Got here boss');
        res.json({id: req.params.id});
    }


};
//#endregion