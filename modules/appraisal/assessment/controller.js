
//#region Self Assessment Evaluation
exports.getSelfAssessment = function (req, res) {
    var data = {
        isOpen: false,
        completed: false,
        assessments: [],
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
                data.period = per; getAssessments(per);
            }
        });
    }
    function getAssessments(per) {
        req.app.db.models.SelfAssessment.find({ employee: req.user.employee.id, period: per.id })
                .populate('-period')
                .exec(function (er, saa) {
                    if (saa && saa.length > 0) {
                        data.completed = saa[0].answer;
                        data.assessments = saa;
                        res.json(data);
                    }
                    else res.status(500).send(er ? 'Could not retrieve self assessment questions' : 'No self assessment questions.');
                })
    }
    /*

     function getAssessments(per){
     req.app.db.models.SelfAssessment.find({employeeId: req.user.employee.employeeId,period:per.id})
     .populate('question')
     .exec(function(er,saa){
     if(er)res.status(500).send('An error occurred while retrieving self assessment data');
     else if(saa.length > 0){
     data.completed = true;
     saa.forEach(function(item){
     data.assessments.push({
     _id : item.id,
     question: item.question.question,
     answer: item.answer,
     dateCompleted: item.dateCompleted
     })
     });
     res.json(data);
     }
     else{
     data.completed = false;
     req.app.db.models.SelfAssessmentQ.find(function(err,saq){
     if(err) res.status(500).send('Could not retrieve self assessment questions');
     else{
     saq.forEach(function(item){
     data.assessments.push({
     _id: item.id,
     question: item.question
     })
     });
     res.json(data);
     }
     });
     }
     })
     }

     */
    getLatestPeriod();
};//done
exports.performSelfAssessment = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var date = new Date(new Date().toDateString());
    workflow.processed = 0; workflow.completedItems = [];
    workflow.on('returnError', function (msg) { workflow.outcome.errors.push(msg); workflow.emit('response'); })
    workflow.on('validate', function () {
        var assessments = req.body;
        var hasError = false; var q = 0;
        if (assessments.length > 0) {
            assessments.forEach(function (item) {
                q++;
                ['_id', 'question', 'answer']
                        .forEach(function (itm) { if (!item[itm]) hasError = true; });
            });
            if (hasError) { workflow.outcome.errors.push('Please complete the form and submit again'); workflow.emit('response'); }
            else
                req.app.kenna.utility.getCurrentPeriod(req.app.db.models.AppraisalPeriod,
                        function (err, p) {
                            if (err) { workflow.outcome.errors.push(err); workflow.emit('response'); }
                            else workflow.emit('appraise', assessments, p);
                        });
        }
    });
    workflow.on('appraise', function (assessments, period) {
        workflow.period = period;
        var async = require('async');
        async.each(
                assessments,
                function (single, cb) {
                    req.app.db.models.SelfAssessment.findById(single._id, function (err, ans) {
                        if (ans) {
                            req.app.kenna.utility.populate(ans, single);
                            ans.answer = single.answer;
                            ans.save(function (e, itm) {
                                if (e) cb(e);
                                else { workflow.completedItems.push(itm); cb(); }
                            });
                        } else cb('not found');
                    });
                },
                function (err) {
                    if (err) {
                        async.each(
                                workflow.completedItems,
                                function (saved, cbx) { saved.remove(function () { cbx(); }); },
                                function () { workflow.outcome.errors.push('An error occurred while saving data.'); workflow.emit('response'); }
                        );
                    }
                    else {
                        req.app.db.models.EmployeeAppraisal.findOneAndUpdate({ employee: req.user.employee.id, period: workflow.period.id }, {
                            assessment: { list: workflow.completedItems, date: new Date() }
                        }, function () {
                            workflow.outcome.success = true;
                            workflow.outcome.message = "Successfully completed self assessment.";
                            workflow.emit('response');
                        })
                    }
                }
        );
    });
    workflow.emit('validate');
};//done
//#endregion

//Self Assessments
exports.getAssessmentQ = function (req, res) {
    req.app.db.models.SelfAssessmentQ.find(function (err, saq) {
        if (err) res.status(500).send('Could not retrieve self assessment questions');
        else res.json(saq);
    });
};
exports.saveAssessmentQ = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var assessment = req.body;
        if (assessment.delete) workflow.emit('delete', assessment._id);
        else {
            if (!assessment.question) workflow.outcome.errors.push('The assessment question is required.');
            if (workflow.hasErrors()) workflow.emit('response');
            else if (assessment._id) workflow.emit('update', assessment);
            else workflow.emit('create', assessment);
        }
    });
    workflow.on('create', function (item) {
        req.app.db.models.SelfAssessmentQ.create(item, function (err, exp) {
            if (err) { workflow.outcome.errors.push('An error occurred while creating the record.'); return workflow.emit('exception', err); }
            else {
                workflow.outcome.item = exp;
                workflow.outcome.success = true;
                workflow.outcome.message = 'Self Assessment question successfully added';
                workflow.emit('response');
            }
        });
    });
    workflow.on('update', function (item) {
        req.app.db.models.SelfAssessmentQ.findById(item._id, function (err, exp) {
            if (err) { workflow.outcome.errors.push('An error occurred while updating the record.'); return workflow.emit('exception', err); }
            else if (exp) {
                req.app.kenna.utility.populate(exp, item);
                exp.save(function (er, itm) {
                    if (err) { workflow.outcome.errors.push('An error occurred while updating the record.'); return workflow.emit('exception', err); }
                    else {
                        workflow.outcome.item = exp;
                        workflow.outcome.success = true;
                        workflow.outcome.message = 'Self Assessment question successfully updated';
                        workflow.emit('response');
                    }
                })
            } else {

            }
        });
    });
    workflow.on('delete', function (id) {
        req.app.db.models.SelfAssessmentQ.findByIdAndRemove(id, function (err, exp) {
            if (err) { workflow.outcome.errors.push('An error occurred while deleting the record.'); return workflow.emit('exception', err); }
            else {
                workflow.outcome.item = exp;
                workflow.outcome.success = true;
                workflow.outcome.message = 'Self Assessment question successfully deleted';
                workflow.emit('response');
            }
        });
    });
    workflow.emit('validate');
};
exports.getAssessmentReports = function (req, res) {
    req.app.kenna.utility.getLatestPeriod(req.app.db.models.AppraisalPeriod, function (e, per) {
        if (e) res.status(500).send(e);
        else
            req.app.db.models.EmployeeAppraisal.find({ period: per.period.id }, 'period employee assessment')
                    .populate('employee', 'firstName lastName designation department employeeId')
                    .populate('period', 'name year')
                    .exec(function (err, pc) {
                        req.app.db.models.Organisation.populate(pc, { path: 'employee.department', select: 'name' }, function () {
                            res.json(pc || []);



                            
                        });
                    });
    });
};
