exports.getEvaluationBySubordinates = function (req, res) {
    var data = {
        isOpen: false,
        appraised: false,
        evaluations: [],
        period: {}
    };
    function getLatestPeriod() {
        req.app.db.models.AppraisalPeriod.find(function (err, pers) {
            if (err) res.status(500).send('Could not retrieve the appraisal period status.');
            else if (pers.length == 0) res.status(500).send('no Appraisal period found.');
            else {
                var per = pers[pers.length - 1];
                var today = new Date(new Date().toDateString());
                data.isOpen = today >= per.start && today <= per.end;
                data.period = per; getEvaluations();
            }
        });
    }
    function getEvaluations() {
        req.app.db.models.SupervisorEvaluation.find({
            supervisor: req.user.employee.id, period: data.period.id
        }, '-subordinate -supervisor -period -score', function (r, apps) {
            if (!r && apps.length > 0) {
                data.evaluations = apps;
                res.json(data);
            } else res.status(r ? 500 : 404).send(r ? 'Could not retrieve the appraisal period status.' : 'No subordinate evaluation found');
        });
    }
    if (req.user.employee.isASupervisor()) getLatestPeriod();
    else res.status(403).send('Employee is not a supervisor.');
};
exports.getEvaluationForMySupervisor = function (req, res) {
    var data = {
        appraised: false,
        evaluations: {},
        period: {}
    };
    function getLatestPeriod() {
        req.app.db.models.AppraisalPeriod.find(function (err, pers) {
            if (err) res.status(500).send('Could not retrieve the appraisal period status.');
            else if (pers.length == 0) res.status(500).send('no Appraisal period found.');
            else {
                var per = pers[pers.length - 1];
                var today = new Date(new Date().toDateString());
                data.isOpen = today >= per.start && today <= per.end;
                data.period = per; getEvaluations();
            }
        });
    }
    function getEvaluations() {
        req.app.db.models.SupervisorEvaluation.
            findOne({
                subordinate: req.user.employee.id, period: data.period.id
            }, '-subordinate -supervisor -period -score',
            function (r, apps) {
                if (apps) {
                    if (!!apps.scoreText) res.json({
                        appraised: true, isOpen: true, message: 'You have already given your feedback for this period.'
                    }); else {
                        req.app.db.models.Employee.findById(req.user.employee.supervisor)
                            .populate('department')
                            .exec(function (e, t) {
                                if (t) {
                                    data.super = {
                                        name: t.fullName(), department: t.department.name, desig: t.designation
                                    };
                                    data.evaluations = apps;
                                    res.json(data);
                                } else res.json({
                                    cantEval: true, message: 'Selected supervisor was not found'
                                });
                            });
                    }
                } else if (!r && !apps) {
                    //#region New Addition Date: 2015/07/24
                    function getEvaluations(emp, cb) {
                        req.app.db.models.SupervisorEvaluationArea.find(function (err, saq) {
                            var evals = {}; saq = err ? [] : saq;
                            saq.forEach(function (itm) {
                                evals[itm.title] = {
                                    more: itm.description, scoreText: ''
                                };
                            });
                            var SupervisorEvaluation = {
                                name: emp.fullName(),
                                supervisor: emp.id,
                                subordinate: req.user.employee.id,
                                details: evals,
                                period: data.period.id,
                                date: new Date(new Date().toDateString())
                            };
                            req.app.db.models.SupervisorEvaluation.create(SupervisorEvaluation, function (err) { cb(err); });
                        });
                    }
                    req.app.db.models.Employee.findById(req.user.employee.supervisor)
                        .populate('department')
                        .exec(function (e, sup) {
                            if (sup) {
                                getEvaluations(sup, function (e) {
                                    if (e) return res.json({ cantEval: true, message: 'Could not setup supervisor evaluation data.' });
                                    return exports.getEvaluationForMySupervisor(req, res);
                                });
                            } else res.json({ cantEval: true, message: e ? 'Could not retrieve supervisor data.' : 'Selected supervisor was not found' })
                        })
                    //#endregion
                } else res.status(r ? 500 : 404).send(r ? 'Could not retrieve the appraisal period status.' : 'No subordinate evaluation present');
            });
    }
    if (req.user.employee.supervisor) {
        getLatestPeriod();
    } else res.json({
        cantEval: true, message: 'You are not currently assigned to a superior'
    });
};
exports.performEvaluateSupervisor = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var evaluation = req.body;
        var hasErr = false, wrongScore = false;
        for (var t in evaluation.details) {
            if (!evaluation.details[t].scoreText)
                hasErr = true;
            else if (["Exceptional", "Excellent", "Very Good", "Good", "Satisfactory"].indexOf(evaluation.details[t].scoreText) == -1)
                wrongScore = true;
        }
        if (hasErr) {
            workflow.outcome.errors.push('Please complete the form and submit again');
            return workflow.emit('response');
        } else if (wrongScore) {
            workflow.outcome.errors.push('Submitted value contain unacceptable data');
            return workflow.emit('response');
        } else req.app.kenna.utility.getCurrentPeriod(req.app.db.models.AppraisalPeriod,
            function (err, p) {
                if (err) {
                    workflow.outcome.errors.push(err);
                    return workflow.emit('response');
                }
                else workflow.emit('saveData', evaluation, p);
            });
    });
    function cal(arr) {
        var count = arr.length; var sum = 0;
        var ref = {
            "exceptional": 5,
            "excellent": 4,
            "very good": 3,
            "good": 2,
            "satisfactory": 1
        }
        arr.forEach(function (itm) {
            if (ref[itm.toLowerCase()]) { sum += parseInt(ref[itm.toLowerCase()]); }
        });
        var percent = Math.round((sum * 100) / (count * 5));
        var text = '';
        if (100 >= percent && percent > 80)
            text = 'Exceptional';
        else if (percent <= 80 && percent > 60)
            text = 'Excellent';
        else if (60 >= percent && percent > 40)
            text = 'Very Good';
        else if (40 >= percent && percent > 20)
            text = 'Good';
        else
            text = 'Satisfactory';
        if (count == 0) return { score: 0 };
        else return {
            score: percent, scoreText: text
        }
    }
    workflow.on('saveData', function (data, p) {

        var score = []; var error = false; var errcol = [];

        for (var t in data.details) {
            if (data.details[t].scoreText) {
                score.push(data.details[t].scoreText);
            }
        }
        if (error) {
            workflow.outcome.errors.push('The following areas "' + errcol.join(', ') + '" must be appraised.');
            return workflow.emit('response');
        }
        var t = cal(score); data.scoreText = t.scoreText; data.score = t.score;
        data.date = new Date(new Date().toDateString());
        req.app.db.models.SupervisorEvaluation
            .findByIdAndUpdate(data._id, { details: data.details, score: data.score, scoreText: data.scoreText, date: data.date })
            .exec(function (er, ev) {
                if (!er && ev) {
                    workflow.outcome.success = true;
                    workflow.outcome.item = {
                        appraised: true, isOpen: true, message: 'Your feedback was successfully processed'
                    };
                    //req.app.db.models.EmployeeAppraisal.findOne({employee:})
                    workflow.outcome.message = "Your feedback was successfully processed."
                    workflow.emit('response');
                } else {
                    workflow.outcome.errors.push(er ? 'Could not process the inputted data' : 'Supervisor Evaluation was not found');
                    return workflow.emit('response');
                }
            });
        //req.app.db.models.SupervisorEvaluation
        //    .findById(data._id)
        //    .exec(function(er,ev){
        //        if(!er && ev){
        //            if(ev.period != p.id){
        //                workflow.outcome.errors.push('Evaluation belong to another appraisal period');
        //                return  workflow.emit('response');
        //            }else{
        //                var score = []; var error = false; var errcol = [];
        //                for (var t in ev.details){
        //                    if(data.details[t].scoreText){
        //                        ev.details[t].scoreText =  data.details[t].scoreText;
        //                        score.push(ev.details[t].scoreText);
        //                    }else {
        //                        error = true; errCol.push(t);
        //                    }
        //                }
        //                if(error){
        //                    workflow.outcome.errors.push('The following areas "'+errcol.join(', ') +'" must be appraised.');
        //                    return  workflow.emit('response');
        //                }else{
        //                    ev.scoring =  new Object(data.details);
        //                    var t = cal(score); ev.scoreText = t.scoreText; ev.score = t.score;
        //                    ev.date = new Date(new Date().toDateString());
        //                    ev.save(function(er,g){
        //                        workflow.outcome.success = true;
        //                        workflow.outcome.item = {
        //                            appraised:true, isOpen: true, message: 'Your feedback was successfully processed'
        //                        };
        //                        workflow.outcome.message = "Your feedback was successfully processed."
        //                        workflow.emit('response');
        //                    });
        //                }
        //
        //            }
        //
        //        }else{
        //            workflow.outcome.errors.push(er?'Could not process the inputted data':'Supervisor Evaluation was not found');
        //            return  workflow.emit('response');
        //        }
        //    })
    });
    workflow.emit('validate');
};
//Supervisor Evaluations employee: { $last: "$employee" },  ,  assessments: { $push: "$$ROOT" }
exports.getEvaluationArea = function (req, res) {
    req.app.db.models.SupervisorEvaluationArea.find(function (err, saq) {
        if (err) res.status(500).send('Could not retrieve supervisor evaluation areas');
        else res.json(saq);
    });
};
exports.saveEvaluationArea = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var assessment = req.body;
        if (assessment.delete) workflow.emit('delete', assessment._id);
        else {
            if (!assessment.title) workflow.outcome.errors.push('The evaluation area name/title is required.');
            if (workflow.hasErrors()) return workflow.emit('response');
            else if (assessment._id) workflow.emit('update', assessment);
            else workflow.emit('create', assessment);
        }
    });
    workflow.on('create', function (item) {
        req.app.db.models.SupervisorEvaluationArea.create(item, function (err, exp) {
            if (err) { workflow.outcome.errors.push('An error occurred while creating the record.'); return workflow.emit('exception', err); }
            else {
                workflow.outcome.item = exp;
                workflow.outcome.success = true;
                workflow.outcome.message = 'Supervisor evaluation area successfully added';
                workflow.emit('response');
            }
        });
    });
    workflow.on('update', function (item) {
        req.app.db.models.SupervisorEvaluationArea.findById(item._id, function (err, exp) {
            if (err) { workflow.outcome.errors.push('An error occurred while updating the record.'); return workflow.emit('exception', err); }
            else if (exp) {
                req.app.kenna.utility.populate(exp, item);
                exp.save(function (er, itm) {
                    if (err) { workflow.outcome.errors.push('An error occurred while updating the record.'); return workflow.emit('exception', err); }
                    else {
                        workflow.outcome.item = exp;
                        workflow.outcome.success = true;
                        workflow.outcome.message = 'Supervisor evaluation area successfully updated';
                        workflow.emit('response');
                    }
                })
            } else {

            }
        });
    });
    workflow.on('delete', function (id) {
        req.app.db.models.SupervisorEvaluationArea.findByIdAndRemove(id, function (err, exp) {
            if (err) { workflow.outcome.errors.push('An error occurred while deleting the record.'); return workflow.emit('exception', err); }
            else {
                workflow.outcome.item = exp;
                workflow.outcome.success = true;
                workflow.outcome.message = 'Supervisor evaluation area successfully deleted';
                workflow.emit('response');
            }
        });
    });
    workflow.emit('validate');
};
exports.getEvaluationReports = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var data = {
        isOpen: false,
        appraised: false,
        evaluations: [],
        period: {}
    };
    function getLatestPeriod() {
        req.app.db.models.AppraisalPeriod.find(function (err, pers) {
            if (err) res.status(500).send('Could not retrieve the appraisal period status.');
            else if (pers.length == 0) res.status(500).send('no Appraisal period found.');
            else {
                var per = pers[pers.length - 1];
                var today = new Date(new Date().toDateString());
                data.isOpen = today >= per.start && today <= per.end;
                data.period = per; getSupervisors();
            }
        });
    };
    function getEvaluationForSupervisor(sup, cb) {
        req.app.db.models.SupervisorEvaluation.find({ supervisor: sup.id, period: data.period.id }, '-supervisor -period')
            .populate('subordinate', 'firstName lastName designation')
            .exec(function (r, apps) {
                var sum = 0, d = {
                    name: sup.fullName(),
                    department: (sup.department || {}).name,
                    designation: sup.designation,
                    employeeId: sup.employeeId,
                    period: data.period.getName(),
                    year: data.period.year,
                    evaluations: [],
                    incomplete:[]
                };
                (apps || []).forEach(function (i) {
                    if (i.score && i.scoreText) {
                        sum += i.score;
                        d.evaluations.push(i);
                    } 
                });
                if (d.evaluations.length > 0) {
                    var percent = Math.round(sum / d.evaluations.length), text;
                    if (100 >= percent && percent > 80)
                        text = 'Exceptional';
                    else if (percent <= 80 && percent > 60)
                        text = 'Excellent';
                    else if (60 >= percent && percent > 40)
                        text = 'Very Good';
                    else if (40 >= percent && percent > 20)
                        text = 'Good';
                    else if (20 >= percent && percent > 0)
                        text = 'Satisfactory';
                    else { percent = 0; }
                    d.average = percent; d.text = text;
                    if (d.text) data.evaluations.push(d);
                    cb();
                } else cb();
            });
    };
    function getSupervisors() {
        req.app.db.models.Employee.find({ status: { $ne: 'Inactive' } }, 'employeeId firstName lastName designation subordinates department')
                .populate('subordinates', 'firstName lastName designation name')
                .populate('department', 'name')
                .exec(function (err, r) {
                    var async = require('async');
                    async.each((r || []).filter(
                        function (emp) { return (emp.subordinates || []).length > 0; }),
                        getEvaluationForSupervisor, function (e) {
                            res.json(data.evaluations);
                        });
                });
    };
    getLatestPeriod();
};