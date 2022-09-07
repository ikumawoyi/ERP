var exports = exports || {};
// Performance History as Chart(kra)
exports.getPerformanceHistory = function (req, res) {
    req.app.db.models.EmployeeAppraisal
        .aggregate([
                {$match: {"kra.text": {"$ne": null}}},
                {
                    $project: {
                        list: "$kra.list",
                        score: "$kra.score",
                        text: "$kra.text",
                        date: "$kra.date",
                        period: "$period",
                        employee: "$employee"
                    }
                },
                {
                    $group: {
                        _id: {period: "$period", id: "$employee", text: "$text", score: "$score", date: "$date"},
                        data: {$push: "$$ROOT"}
                    }
                },
                {
                    $project: {
                        period: "$_id.period",
                        _id: 0,
                        id: "$_id.id",
                        score: "$_id.score", text: "$_id.text", date: "$_id.date",
                        data: 1, score: 1, text: 1, date: 1, more: 1

                    }
                },
                {
                    $group: {
                        _id: "$id",
                        employee: {$last: "$id"},
                        periods: {$push: "$$CURRENT"}//,
                        // scoring: { text: "$$CURRENT.text", score: "$$CURRENT.score", date: "$$CURRENT.date", more: "$$CURRENT.more" }
                    }
                },
                {$sort: {_id: 1,}}
            ],
            function (err, pc) {
                if (err) res.json([]);
                else {
                    require('async').parallel([function (cb) {
                        req.app.db.models.Employee.populate(pc, {
                            path: 'employee',
                            select: 'firstName lastName designation department'
                        }, function () {
                            cb();
                        });
                    }, function (cb) {
                        req.app.db.models.AppraisalPeriod.populate(pc, {
                            path: 'periods.period',
                            select: 'year name'
                        }, function () {
                            cb();
                        });
                    }], function () {
                        req.app.db.models.Organisation.populate(pc, {
                            path: 'employee.department',
                            select: 'name'
                        }, function () {
                            res.json(pc);
                        });
                    })

                }
            });
};

// Performing Subordinate Performance Competence appraisal
exports.getSubCompetences = function (req, res) {
    var data = {isOpen: false, period: {}, subs: []};// sub :{appraised, kras:[]}
    var async = require('async');
    var us = require('underscore');

    function getData() {
        req.app.db.models.AppraisalPeriod.find(function (err, pers) {
            if (err) res.status(500).send('Could not retrieve the appraisal period status.');
            else if (pers.length == 0) res.status(404).send('no Appraisal period found.');
            else {
                var per = pers[pers.length - 1];
                var today = new Date(new Date().toDateString());
                data.isOpen = today >= per.start && today <= per.end;
                data.period = per;

                async.forEach(req.user.employee.subordinates, function (sub, cb) {
                    var subData = {competence: []};
                    async.parallel([
                            function (cbx) {
                                req.app.db.models.Employee.findById(sub, 'firstName lastName designation department employeeId')
                                    .populate('department')
                                    .exec(function (er, emp) {
                                        if (er) {
                                            cbx();
                                        }
                                        else {
                                            subData.emp = {
                                                code: emp.id,
                                                name: emp.fullName(),
                                                desig: emp.designation,
                                                dept: emp.department.name,
                                                employeeId: emp.employeeId
                                            };
                                            cbx();
                                        }
                                    })
                            }, function (cbx) {
                                req.app.db.models.EmployeeAppraisal
                                    .findOne({employee: sub, period: data.period.id}, 'competence',
                                        function (e, r) {
                                            if (e) cbx();
                                            else if (r) {
                                                subData.text = r.competence.text;
                                                var more = {};
                                                if (r.competence.more) for (var p in r.competence.more) more[p] = r.competence.more[p].scoreText;
                                                subData.more = more;
                                                cbx();
                                            } else cbx();
                                        });
                            },
                            function (cbx) {
                                req.app.db.models.PerformanceCompetence
                                    .find({employee: sub, period: data.period.id},
                                        '-details.catW -period -employee -scoring.score -details.qetW')
                                    .exec(function (er, kas) {
                                        if (er) cbx('An error occurred while retrieving competence appraisal data.');
                                        else if (kas.length > 0) {
                                            var item = kas[0].scoring;
                                            subData.competence = us.groupBy(kas, function (o) {
                                                return o.details.category;
                                            });
                                            subData.appraised = !!(item.score && item.by && item.date, item.text);
                                            if (subData.appraised) {
                                                subData.date = item.date;
                                                subData.by = item.by;
                                            }
                                            cbx();
                                        }
                                        else {
                                            subData.competence = [];
                                            subData.appraised = false;
                                            cbx();
                                        }
                                    });
                            }
                        ], function () {
                            data.subs.push(subData);
                            cb();
                        }
                    );
                }, function (err) {
                    res.json(data);
                });
            }
        });
    }

    getData();
};
exports.performSubCompetenceAppraisal = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.summary = {};
    workflow.competences = [];
    workflow.completed = [];
    workflow.sum = 0;
    workflow.unit = 0;
    var today = new Date(new Date().toDateString());
    var async = require('async');
    workflow.on('validate', function () {
        var data = req.body;
        if (!data.emp || !data.emp.code) workflow.outcome.errors.push('Employee data is required.');
        else if (req.user.employee.subordinates.indexOf(data.emp.code) == -1) {
            workflow.outcome.errors.push('Selected employee is not a subordinate.');
            return workflow.emit('response');
        }
        else workflow.empId = data.emp.code;
        if (!data.competence) workflow.outcome.errors.push('Competence data is required');
        else {
            var msg = '';
            for (var c in data.competence)
                if (data.competence[c] && Array.isArray(data.competence[c]))
                    data.competence[c].forEach(function (item) {
                        if (item._id && item.details && item.details.description && item.details.name && item.scoring && item.scoring.text && item.details.category)
                            workflow.competences.push(item);
                        else if (item._id && item.details && item.details.description && item.details.name && item.details.category && !msg)
                            msg = 'All competence must scored before submitting';
                    });
            if (workflow.competences.length == 0 || msg)
                workflow.outcome.errors.push(msg ? msg : 'No competence was submitted');
        }
        if (workflow.hasErrors()) return workflow.emit('response'); else workflow.emit('checkSize');
    });
    workflow.on('checkSize', function () {
        req.app.db.models.PerformanceCompetence
            .count({employee: workflow.empId, period: workflow.period.id})
            .exec(function (er, count) {
                if (count && count == workflow.competences.length) workflow.emit('startAppraisal');
                else res
                    .status(count ? 400 : 500)
                    .send(count ? 'The submitted performance competences do not match. please refresh and try again.'
                        : 'An error occurred while retrieving performance competence data.');
            });
    });
    workflow.on('startAppraisal', function () {
        var done = [];
        var m = '';
        var name = req.user.employee.fullName();
        async.each(workflow.competences, function (i, cb) {
            req.app.db.models.PerformanceCompetence
                .findOne({employee: workflow.empId, period: workflow.period.id, _id: i._id})
                .exec(function (er, kas) {
                    if (!kas) cb(er ? 'An error occurred while retrieving performance competence data.' : 'Not found');
                    else if (kas.scoring && (kas.scoring.text || kas.scoring.score)) {
                        m = ' performance competence has already been scored.';
                        cb(m);
                    }
                    else {
                        kas.scoring = {
                            score: req.app.kenna.defaultLevels[i.scoring.text.toLowerCase()],
                            text: i.scoring.text,
                            by: name,
                            date: today
                        };
                        workflow.summary[kas.details.category] = workflow.summary[kas.details.category] || {
                                sum: 0,
                                unit: 0,
                                weight: kas.details.catW
                            };
                        ////// check scoring
                        workflow.summary[kas.details.category].sum += (kas.details.qetW * kas.scoring.score);
                        workflow.summary[kas.details.category].unit += kas.details.qetW;
                        kas.save(function (e, r) {
                            done.push(r || kas);
                            cb(e);
                        });
                    }
                });
        }, function (err) {
            if (err) {
                done.forEach(function (itm) {
                    itm.save({scoring: {}});
                });
                res.json({
                    message: err ? err : "Subordinate performance competence could not be completed.",
                    sucess: false
                });
            } else {
                workflow.completed = done;
                workflow.emit('updateSummary');
            }
        });
    });
    workflow.on('updateSummary', function () {
        var totalPoints = 0, totalUnits = 0;
        for (var p in workflow.summary) {
            var value = req.app.kenna.utility.calculateScore(workflow.summary[p].sum, workflow.summary[p].unit);
            workflow.summary[p].score = value.score;
            workflow.summary[p].scoreText = value.text;
            totalPoints += Number(workflow.summary[p].score);
            totalUnits += workflow.summary[p].weight;
            delete workflow.summary[p].sum;
            delete workflow.summary[p].unit;
            delete workflow.summary[p].weight;
        }
        var v = req.app.kenna.utility.calculateScore(totalPoints / 20, totalUnits);
        req.app.db.models.EmployeeAppraisal
            .findOneAndUpdate({employee: workflow.empId, period: workflow.period.id},
                {competence: {list: workflow.completed, score: v.score, text: v.text, more: workflow.summary}},
                function (e, r) {
                    workflow.outcome.success = true;
                    recalculateSingleCompetence(r, req.app);
                    workflow.outcome.message = "Subordinate appraisal was successfully processed."
                    workflow.emit('response');
                });
    });
    workflow.on('isAppraisalOpen', function () {
        req.app.kenna.utility.getCurrentPeriod(
            req.app.db.models.AppraisalPeriod,
            function (er, p) {
                if (er) {
                    workflow.outcome.errors.push(er);
                    return workflow.emit('response');
                }
                else {
                    workflow.period = p;
                    workflow.emit('validate');
                }
            });
    });
    workflow.emit('isAppraisalOpen');
};

function recalculateSingleCompetence(app, server) {
    var calculateScore = function (sum, count) {
        var percent = ((sum * 20) / count).toFixed();
        var text = '';
        if (100 >= percent && percent > 80)
            text = 'Exceptional';
        else if (percent <= 80 && percent > 60)
            text = 'Excellent';
        else if (60 >= percent && percent > 40)
            text = 'Very Good';
        else if (40 >= percent && percent > 20)
            text = 'Good';
        else if (20 >= percent && percent >= 0)
            text = 'Satisfactory';
        else return {score: 0, text: null};
        if (count == 0) return {score: 0, text: null};
        else return {
            score: percent, text: text
        }
    };
    var obj = {};
    if (!(app && app.competence && app.competence.list)) return;
    app.competence.list.forEach(function (i) {
        if (obj[i.details.category]) {
            obj[i.details.category].scores.push({weight: i.details.qetW, score: i.scoring.score});
        }
        else {
            if (!i.scoring) {
                return;
            }
            obj[i.details.category] = {
                weight: i.details.catW,
                scores: [{weight: i.details.qetW, score: i.scoring.score}]
            };
        }
    });
    var summary = {
        cgp: 0,
        units: 0,
        points: 0
    }
    for (var p in obj) {
        obj[p].points = 0;
        obj[p].gp = 0;
        obj[p].units = 0;
        obj[p].scores.forEach(function (i) {
            obj[p].points += i.score * i.weight;
            obj[p].units += i.weight;
        });
        obj[p].gp = (obj[p].points / obj[p].units);
        summary.units += obj[p].weight;
        summary.points += obj[p].gp * obj[p].weight;
    }
    summary.cgp = (summary.points / summary.units);
    var scoring = calculateScore(summary.cgp, 1);
    app.competence.text = scoring.text;
    app.competence.score = scoring.score;
    app.save(function (e) {
        server.recalculationCount.today++;
        server.recalculationCount.total++;
        console.log('Successfully recalculated the competence score.');
    });
};

//Performance-Competence  /Performance is same as competence
exports.getCompetenceCategory = function (req, res) {
    var result = {};
    req.app.db.models.PerformanceCompetenceCategory.find()
        .populate('questions')
        .exec(function (err, saq) {
            if (err) res.status(500).send('Could not retrieve performance competence questions and categories');
            else {
                //req.app.db.models.PerformanceCompetenceQ.populate(saq, { path: 'category'},
                //    function(err,r) {
                //        if(err) res.status(500).send('Could not retrieve performance competence questions and categories');
                //        else if(result.data){ result.sub = r; res.json(result);}else result.sub = r;
                //   });
                //saq.questions.populate('category', 'header', function(er, k){
                //
                //})
                if (result.data) {
                    result.sub = saq;
                    res.json(result);
                } else result.sub = saq;
            }
        });
    req.app.db.models.PerformanceCompetenceCategory.find({}, '-questions', function (err, saq) {
        if (err) res.status(500).send('Could not retrieve performance competence questions and categories');
        else {
            if (result.sub) {
                result.data = saq;
                res.json(result);
            } else result.data = saq;
        }
    });
};
exports.saveCompetenceQ = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var question = req.body;
        if (question.delete) workflow.emit('delete', question._id);
        else {
            if (!question.name) workflow.outcome.errors.push('The question title is required.');
            if (!question.description) workflow.outcome.errors.push('The question text is required.');
            if (!question.category) workflow.outcome.errors.push('The category for the question is required.');
            if (workflow.hasErrors()) return workflow.emit('response');
            else {
                workflow.question = question;
                workflow.emit('getCategory', question);
            }
        }
    });
    workflow.on('getCategory', function () {
        req.app.db.models.PerformanceCompetenceCategory.findById(workflow.question.category._id, function (err, exp) {
            if (err) {
                return workflow.emit('exception', err);
            }
            else if (!exp) {
                workflow.outcome.errors.push('Selected category was not found.');
                return workflow.emit('response');
            }
            else {
                workflow.category = exp;
                workflow.question.category = exp.id;
                workflow.isNew = !workflow.question._id;
                if (workflow.isNew) workflow.emit('create');
                else workflow.emit('update');
            }
        });
    });
    workflow.on('create', function () {
        req.app.db.models.PerformanceCompetenceQ.create(workflow.question, function (err, exp) {
            if (err) {
                workflow.outcome.errors.push('An error occurred while creating the record.');
                return workflow.emit('exception', err);
            }
            else {
                workflow.question = exp;
                workflow.emit('updateCatgory', function () {
                    workflow.outcome.item = workflow.question;
                    workflow.outcome.success = true;
                    workflow.outcome.message = 'Performance competence question successfully added';
                    workflow.emit('response');
                });
            }
        });
    });
    workflow.on('update', function () {
        req.app.db.models.PerformanceCompetenceQ.findById(workflow.question._id, function (err, exp) {
            if (err) {
                workflow.outcome.errors.push('An error occurred while updating the record.');
                return workflow.emit('exception', err);
            }
            else if (exp) {
                workflow.emit('removeFromOthers', exp.id, function () {
                    /////////////////////////////////////////////////
                    //if(workflow.question.filter)
                    //    delete workflow.question.filter;
                    ////////////////////////////////////////////////
                    //////////////////////////////////////////////

                    req.app.kenna.utility.populate(exp, workflow.question, ['filter']);
                    exp.save(function (er, itm) {
                        if (err) {
                            workflow.outcome.errors.push('An error occurred while updating the record.');
                            return workflow.emit('exception', err);
                        }
                        else {
                            workflow.question = itm;
                            workflow.emit('updateCatgory', function () {
                                workflow.outcome.item = workflow.question;
                                workflow.outcome.success = true;
                                workflow.outcome.message = 'Performance competence question successfully updated';
                                workflow.emit('response');
                            });
                        }
                    });
                });
            } else {
                workflow.outcome.errors.push('Performance competence question was not found.');
                return workflow.emit('response');
            }
        });
    });
    workflow.on('delete', function (id) {
        req.app.db.models.PerformanceCompetenceQ.findByIdAndRemove(id, function (err, exp) {
            if (err) {
                workflow.outcome.errors.push('An error occurred while deleting the record.');
                return workflow.emit('exception', err);
            }
            else {
                workflow.question = exp;
                workflow.emit('removeFromOthers', exp.id, function () {
                    workflow.outcome.item = workflow.question;
                    workflow.outcome.success = true;
                    workflow.outcome.message = 'Performance competence question successfully deleted';
                    workflow.emit('response');
                });
            }
        });
    });
    workflow.on('updateCatgory', function (cb) {
        if (workflow.category.questions.indexOf(workflow.question.id) == -1) {
            workflow.category.questions.push(workflow.question.id);
            workflow.category.save(function (er, area) {
                if (er) cb('could not update category');
                else {
                    workflow.category = area;
                    cb(undefined, area);
                }
            });
        } else cb(undefined);
    });
    workflow.on('removeFromOthers', function (question, cb) {
        var length = 0;
        var count = 0;

        function done() {
            if (++count >= length) cb();
        }

        req.app.db.models.PerformanceCompetenceCategory.find({questions: question}, function (err, exp) {
            if (err || exp.length == 0) done();
            else {
                length = exp.length;
                exp.forEach(function (item) {
                    if (item.id != workflow.category.id) {
                        var i = item.questions.indexOf(question);
                        if (i >= 0) item.questions.splice(i, 1);
                        item.save(function () {
                            done();
                        });
                    } else done();
                });
            }
        });
    });
    workflow.emit('validate');
};
exports.saveCompetenceCategory = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var cat = req.body;
        if (cat.delete) workflow.emit('delete', cat._id);
        else {
            if (!cat.header) workflow.outcome.errors.push('The performance category header is required.');
            if (workflow.hasErrors()) return workflow.emit('response');
            else if (cat._id) workflow.emit('update', cat);
            else workflow.emit('create', cat);
        }
    });
    workflow.on('create', function (item) {
        req.app.db.models.PerformanceCompetenceCategory.create(item, function (err, exp) {
            if (err) {
                workflow.outcome.errors.push('An error occurred while creating the record.');
                return workflow.emit('exception', err);
            }
            else {
                workflow.outcome.item = exp;
                workflow.outcome.success = true;
                workflow.outcome.message = 'Performance competence category successfully added';
                workflow.emit('response');
            }
        });
    });
    workflow.on('update', function (item) {
        delete item.questions;
        req.app.db.models.PerformanceCompetenceCategory.findByIdAndUpdate(item._id, item, function (err, exp) {
            if (err) {
                workflow.outcome.errors.push('An error occurred while updating the record.');
                return workflow.emit('exception', err);
            }
            else if (exp) {
                workflow.outcome.item = exp;
                workflow.outcome.success = true;
                workflow.outcome.message = 'Performance competence category successfully updated';
                workflow.emit('response');
            } else {
                workflow.outcome.errors.push('Record was not found.');
                return workflow.emit('exception', err);
            }
        });
    });
    workflow.on('delete', function (id) {
        req.app.db.models.PerformanceCompetenceCategory.findByIdAndRemove(id, function (err, exp) {
            if (err) {
                workflow.outcome.errors.push('An error occurred while deleting the record.');
                return workflow.emit('exception', err);
            }
            else {
                workflow.outcome.item = exp;
                workflow.outcome.success = true;
                workflow.outcome.message = 'Performance competence category successfully deleted';
                workflow.emit('response');
            }
        });
    });
    workflow.emit('validate');
};
exports.getCompetenceReports = function (req, res) {
    var m = require('mongoose').SchemaTypes.ObjectId;
    req.app.kenna.utility.getLatestPeriod(req.app.db.models.AppraisalPeriod, function (e, per) {
        if (e) res.status(500).send(e);
        else
            req.app.db.models.EmployeeAppraisal.find(
                {period: per.period.id, "kra.text": {"$ne": null}}
                , 'period employee competence')
                .populate('employee', 'firstName lastName designation department employeeId')
                .populate('period', 'name year')
                .exec(function (err, pc) {
                    req.app.db.models.Organisation.populate(pc, {
                        path: 'employee.department',
                        select: 'name'
                    }, function () {
                        res.json(pc || []);
                    });
                });
    });
};

exports.getCompetenceReport = function (req, res) {
    var data = {isOpen: false, appraised: false, competences: [], cat: {}, period: {}};

    function getLatestPeriod() {
        req.app.db.models.AppraisalPeriod.find(function (err, pers) {
            if (err) res.status(500).send('Could not retrieve the appraisal period status.');
            else if (pers.length == 0) res.status(500).send('no Appraisal period found.');
            else {
                var per = pers[pers.length - 1];
                var today = new Date(new Date().toDateString());
                data.isOpen = today >= per.start && today <= per.end;
                data.period = per;
                getCompetences();
            }
        });
    }

    function getCompetences() {
        console.log('Getting data for competence.')
        require('async').parallel([
            function (cb) {
                req.app.db.models.EmployeeAppraisal
                    .findOne({employee: req.user.employee.id, period: data.period.id},
                        'competence',
                        function (er, kas) {
                            if (!(er || !kas || !kas.competence.more)) {
                                for (var p in kas.competence.more) {
                                    data.cat[p] = kas.competence.more[p].scoreText;
                                }
                                data.overall = kas.competence.text;
                            }
                            cb();
                        });
            },
            function (cb) {
                req.app.db.models.PerformanceCompetence
                    .find({employee: req.user.employee.id, period: data.period.id},
                        '-period -employee -scoring.score',
                        function (er, kas) {
                            if (er) cb({
                                code: 500,
                                msg: 'An error occurred while retrieving Performance Competence data'
                            });
                            else if (kas.length > 0) {
                                data.competences = require('underscore').groupBy(kas, function (o) {
                                    return o.details.category;
                                });
                                cb();
                            }
                            else cb({code: 404, msg: 'No Performance Competence data found.'});
                        });
            }
        ], function (e, result) {
            if (e) res.status(e.code).send(e.msg);
            else res.json(data);
        });
    };
    getLatestPeriod();
};

exports.recalculateCompetence = function (req, res) {
    var async = require('async');
    var calculateScore = function (sum, count) {
        var percent = ((sum * 20) / count).toFixed();
        var text = '';
        if (100 >= percent && percent > 80)
            text = 'Exceptional';
        else if (percent <= 80 && percent > 60)
            text = 'Excellent';
        else if (60 >= percent && percent > 40)
            text = 'Very Good';
        else if (40 >= percent && percent > 20)
            text = 'Good';
        else if (20 >= percent && percent >= 0)
            text = 'Satisfactory';
        else return {score: 0, text: null};
        if (count == 0) return {score: 0, text: null};
        else return {
            score: percent, text: text
        }
    };
    req.app.db.models.EmployeeAppraisal.find({})
        .exec(function (e, apps) {
            var success = 0, failure = 0, same = 0, empty = 0;
            async.each(apps || [], function (app, cb) {
                var obj = {};
                var failed = false;
                app.competence.list.forEach(function (i) {
                    if (failed) return;
                    if (obj[i.details.category]) {
                        obj[i.details.category].scores.push({weight: i.details.qetW, score: i.scoring.score});
                    }
                    else {
                        if (!i.scoring) {
                            failed = true;
                            return
                        }

                        obj[i.details.category] = {
                            weight: i.details.catW,
                            scores: [{weight: i.details.qetW, score: i.scoring.score}]
                        };
                    }
                });
                if (failed) {
                    empty++;
                    return cb();
                }
                var summary = {
                    cgp: 0,
                    units: 0,
                    points: 0
                }
                for (var p in obj) {
                    obj[p].points = 0;
                    obj[p].gp = 0;
                    obj[p].units = 0;
                    obj[p].scores.forEach(function (i) {
                        obj[p].points += i.score * i.weight;
                        obj[p].units += i.weight;
                    });
                    obj[p].gp = (obj[p].points / obj[p].units);
                    summary.units += obj[p].weight;
                    summary.points += obj[p].gp * obj[p].weight;
                }
                summary.cgp = (summary.points / summary.units);
                var scoring = calculateScore(summary.cgp, 1);
                app.competence.text = scoring.text;
                if (app.competence.score == scoring.score) same++;
                app.competence.score = scoring.score;
                app.save(function (e) {
                    e ? failure++ : success++;
                    cb();
                });
            }, function (e) {
                console.log('Completed the recalculation process. Success:%d\t.Failure:%d\t.Same:%d\t.Empty:%d\t', success, failure, same, empty);
                if (res && res.json) res.json({
                    message: 'Recalculation complete.',
                    processed: success,
                    failed: failure,
                    sameValue: same,
                    empty: empty
                });
                else return;
            });
        });
};

exports.deleteAppraisalForEmployee = function (req, res) {
    var async = require('async');
    var query = {
        employee: req.body.employee,
        period: req.body.period
    };
    console.log('Query data', query);
    //query = {
    //    employee: "5581a126aa0de72c0980ff0f",
    //    period: "560eb084814f1f622a2efddf"
    //};
    req.app.db.models.PerformanceCompetence.find(query)
        .exec(function (e, comps) {
            async.each(comps || [], function (comp, cb) {
                comp.scoring = undefined;
                comp.save(cb);
            }, function (e) {
                if (!e)
                    req.app.db.models.PerformanceCompetence
                        .find(query,
                            function (r, apps) {
                                console.log(apps);
                                req.app.db.models.EmployeeAppraisal.findOne(query, function (er, app) {
                                    console.log(app);
                                        if (!er && app) {
                                            app.competence = {list: apps};
                                            app.save(function (ee) {
                                                ee ? console.log('Could not modify the performance competence for ', query) : console.log('Successfully modified the performance competence appraisal for ', query);
                                                res.json({
                                                    success: true,
                                                    message: ee ? 'Could not modify the performance competence for '
                                                        : 'Successfully modified the performance competence appraisal for ',
                                                    query: query
                                                });
                                            });
                                        } else res.json({
                                            success: false,
                                            message: er? 'Could not modify employee appraisal': 'employee appraisal not found.',
                                            error: e
                                        })
                                    });
                            });
                else res.json({success: false, message: 'Could not complete request', error: e})
            })
        });

};