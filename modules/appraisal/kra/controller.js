
exports.getKraAsAdMin = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('getData', function () {
        req.app.db.models.KraArea
                .find()
                .populate('kras')
                .exec(function (err, pers) {
                    req.app.db.models.Organisation
                            .populate(pers,
                            {
                                path: 'kras.department'//,select: 'name'
                            },
                            function () {
                                res.send(pers);
                            })
                });
    });
    workflow.emit('getData');
};

//KRA Appraisal
exports.addKraArea = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var kraArea = req.body;
    if (!kraArea.name) {
        workflow.outcome.errors.push('The area name is required.');
        return workflow.emit('response');
    }
    else {
        req.app.db.models.KraArea.create({ name: kraArea.name }, function (err, exp) {
            if (err) { return workflow.emit('exception', err); }
            else {
                workflow.outcome.item = exp;
                workflow.outcome.success = true;
                workflow.outcome.message = 'KRA Area added';
                workflow.emit('response');
            }
        });
    }
};
exports.deleteKraArea = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var kraAreaId = req.params.id;
    req.app.db.models.KraArea.findByIdAndRemove(kraAreaId, function (err, exp) {
        if (err) { return workflow.emit('exception', err); }
        else {
            workflow.outcome.item = exp;
            workflow.outcome.success = true;
            workflow.outcome.message = 'KRA Area deleted';
            workflow.emit('response');
        }
    });
};
exports.saveKRA = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var kra = req.body;
        delete kra.chosen; if (kra.removed) delete kra.removed;
        ['area', 'description', 'designations', 'department']
                .forEach(function (item) {
                    if (!kra[item]) workflow.outcome.errfor[item] = 'required';
                });
        workflow.kra = kra;
        if (workflow.hasErrors()) {
            workflow.outcome.errors.push('Please ensure that all required fields are entered.');
            return workflow.emit('response');
        }
        else workflow.emit('getArea');
    });
    workflow.on('getArea', function () {
        req.app.db.models.KraArea.findById(workflow.kra.area._id, function (err, exp) {
            if (err) { return workflow.emit('exception', err); }
            else if (!exp) {
                workflow.outcome.errors.push('Selected KRA Area was not found.');
                return workflow.emit('response');
            }
            else {
                workflow.kraArea = exp; workflow.kra.area = exp.id; workflow.isNew = !workflow.kra._id;
                workflow.kra.department = workflow.kra.department._id;
                if (workflow.isNew) workflow.emit('create');
                else workflow.emit('update');
            }
        });
    });
    workflow.on('updateArea', function () {
        if (workflow.kraArea.kras.indexOf(workflow.kra.id) == -1) {
            workflow.kraArea.kras.push(workflow.kra.id);
            workflow.kraArea.save(function (er, area) {
                if (er) workflow.emit('sendResponse', true);
                else { workflow.kraArea = area; workflow.emit('sendResponse'); }
            });
        } else workflow.emit('sendResponse');
    });
    workflow.on('sendResponse', function (er) {
        workflow.outcome.item = { area: workflow.kraArea, kra: workflow.kra };
        workflow.outcome.success = true;
        var r = workflow.isNew;
        workflow.outcome.message = r ? 'KRA Description added' : 'KRA Description updated';
        workflow.outcome.message += er ? ', could not update area' : '';
        workflow.emit('response');
    });
    workflow.on('update', function () {
        req.app.db.models.KRA.findById(workflow.kra._id, function (err, exp) {
            if (err) { return workflow.emit('exception', err); }
            else if (!exp) { return workflow.emit('create'); }
            else {
                workflow.emit('removeFromOthers', exp.id, function () {
                    req.app.kenna.utility.populate(exp, workflow.kra, ['department']);
                    exp.save(function (err, kra) {
                        if (err) { return workflow.emit('exception', err); }
                        else {
                            workflow.kra = kra;
                            workflow.emit('updateArea');
                        }
                    });
                });
            }
        });
    });
    workflow.on('removeFromOthers', function (kra, cb) {
        var length = 0; var count = 0;
        function done() {
            if (++count >= length) cb();
        }
        req.app.db.models.KraArea.find({ kras: kra }, function (err, exp) {
            if (err || exp.length == 0) done();
            else {
                length = exp.length;
                exp.forEach(function (item) {
                    if (item.id != workflow.kraArea.id) {
                        var i = item.kras.indexOf(kra);
                        if (i >= 0) item.kras.splice(i, 1);
                        item.save(function () { done(); });
                    }
                    else done();
                });
            }
        });
    });
    workflow.on('create', function () {
        req.app.db.models.KRA.create(workflow.kra, function (err, kra) {
            if (err) { return workflow.emit('exception', err); }
            else { workflow.kra = kra; workflow.emit('updateArea'); }
        });
    });
    workflow.emit('validate');
};

exports.getKraReports = function (req, res) {
    req.app.kenna.utility.getLatestPeriod(req.app.db.models.AppraisalPeriod, function (e, per) {
        if (e) res.status(500).send(e);
        else
            req.app.db.models.EmployeeAppraisal.find(
                    { period: per.period.id, "kra.text": { "$ne": null } }
                    , 'period employee kra')
                    .populate('employee', 'firstName lastName designation department employeeId')
                    .populate('period', 'name year')
                    .exec(function (err, pc) {
                        req.app.db.models.Organisation.populate(pc, { path: 'employee.department', select: 'name' }, function () {res.json(pc || []);});
                    });
    });
};

// Adding KRA Achievements
exports.getKraAppraisal = function (req, res) {
    var data = {
        isOpen: false, appraised: false, kras: [], areas: [], period: {}
    };
    var async = require('async');
    function getLatestPeriod() {
        req.app.db.models.AppraisalPeriod.find(function (err, pers) {
            if (err) res.status(500).send('Could not retrieve the appraisal period status.');
            else if (pers.length == 0) res.status(500).send('no Appraisal period found.');
            else {
                var per = pers[pers.length - 1];
                var today = new Date(new Date().toDateString());
                data.isOpen = today >= per.start && today <= per.end;
                data.period = per; getKraAppraisals();
            }
        });
    }
    function getKraAppraisals() {
        var us = require('underscore');
        async.parallel([
            function (cbx) {
                req.app.db.models.KraAppraisal
                        .find({ employee: req.user.employee.id, period: data.period.id },
                        '-details.catW -period -employee')
                        .exec(function (er, kas) {
                            if (er) cbx({ code: 500, text: 'An error occurred while retrieving kra appraisal data.' });
                            else if (kas.length > 0) {
                                var item = kas[0].scoring || {};
                                data.kras = us.groupBy(kas, function (o) { return o.details.area; });
                                data.appraised = !!(item.score && item.by && item.date, item.text);
                                if (data.appraised) { data.date = item.date; data.by = item.by; }
                                cbx();
                            }
                            else { cbx({ code: 404, text: 'No KRA Appraisal data found.' }); }
                        });
            },
            function (cbx) {
                req.app.db.models.EmployeeAppraisal
                        .findOne({ employee: req.user.employee.id, period: data.period.id }, 'kra',
                        function (e, r) {
                            if (e || !r) cbx();
                            else { data.text = r.kra.text; cbx(); }
                        });
            }
        ], function (er) {
            if (er) res.status(er.code).send(er.text);
            else res.json(data);
        });

    }
    getLatestPeriod();
};
exports.performAddKraAchievement = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('returnError', function (msg) { workflow.outcome.errors.push(msg); workflow.emit('response'); })
    workflow.on('validate', function () {
        var appr = req.body;
        if (!appr.achievement) return workflow.emit('returnError', 'Please ensure achievement is inputted.');
        else if (!(appr.details || {}).kra) return workflow.emit('returnError', 'Invalid kra.');
        else {
            workflow.appr = appr;
            workflow.emit('getKRAAppraisal', appr);
        }
    });
    workflow.on('getKRAAppraisal', function (apprx) {
        req.app.db.models.KraAppraisal
                .findById(apprx._id)
                .exec(function (er, apr) {
                    if (apr) {
                        if (apr.employee != req.user.employee.id) return workflow.emit('returnError', 'Appraisal belongs to another employee.');
                        else if (apr.scoring.score || apr.scoring.date || apr.scoring.by) return workflow.emit('returnError', 'Cannot add achievements for an already scored kra.');
                        else {
                            apr.achievement = apprx.achievement; apr.date = new Date(new Date().toDateString());
                            apr.save(function (e, a) {
                                if (er) return workflow.emit('returnError', 'Error occurred while modifying achievements.');
                                else {
                                    workflow.outcome.success = true;
                                    workflow.outcome.message = 'Achievements successfully modified';
                                    workflow.emit('response');
                                }
                            });
                        }
                    } else return workflow.emit('returnError', er ? 'An error occured while retrieving appraisal' : 'KRA Appraisal was not found.');
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

exports.performKraAppraisal = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.kras = []; workflow.completed = []; workflow.sum = 0; workflow.unit = 0;
    var today = new Date(new Date().toDateString());
    var async = require('async');
    workflow.on('validate', function () {
        var data = req.body;
        if (!data.emp || !data.emp.code)
            workflow.outcome.errors.push('Employee data is required.')
        else if (req.user.employee.subordinates.indexOf(data.emp.code) == -1) {
            workflow.outcome.errors.push('Selected employee is not a subordinate.');
            return workflow.emit('response');
        }
        else workflow.empId = data.emp.code;
        if (!data.kras)
            workflow.outcome.errors.push('KRA data is required');
        else {
            var msg = '';
            for (var c in data.kras)
                if (data.kras[c] && Array.isArray(data.kras[c]))
                    data.kras[c].forEach(function (item) {
                        if (item._id && item.details && item.details.kra && item.scoring && item.scoring.text)
                            workflow.kras.push(item);
                        else if (item._id && item.details && item.details.kra && !msg)
                            msg = 'All kras must scored before submitting';
                    });
            if (data.kras.length == 0 || msg)
                workflow.outcome.errors.push(msg ? msg : 'No KRA was submitted');
        }
        if (workflow.hasErrors()) return workflow.emit('response'); else workflow.emit('checkSize');
    });
    workflow.on('checkSize', function () {
        req.app.db.models.KraAppraisal
                .count({ employee: workflow.empId, period: workflow.period.id })
                .exec(function (er, count) {
                    if (count && count == workflow.kras.length) workflow.emit('startAppraisal');
                    else res
                            .status(count ? 400 : 500)
                            .send(count ? 'The submitted kras do not match. please refresh and try again.'
                                    : 'An error occurred while retrieving kra appraisal data.');
                });
    });
    workflow.on('startAppraisal', function () {
        var done = []; var m = ''; var name = req.user.employee.fullName();
        async.each(workflow.kras, function (i, cb) {
            req.app.db.models.KraAppraisal
                    .findOne({ employee: workflow.empId, period: workflow.period.id, _id: i._id })
                    .exec(function (er, kas) {
                        if (!kas) cb(er ? 'An error occurred while retrieving kra appraisal data.' : 'Not found');
                        else if (kas.scoring && (kas.scoring.text || kas.scoring.score))
                        { m = 'Kra has already been scored.'; cb(m); }
                        else {
                            kas.scoring = {
                                score: req.app.kenna.defaultLevels[i.scoring.text.toLowerCase()],
                                text: i.scoring.text,
                                by: name,
                                date: today
                            };
                            workflow.sum += (kas.details.catW * kas.scoring.score);
                            workflow.unit += kas.details.catW;
                            kas.save(function (e, r) {
                                done.push(r || kas);
                                cb(e);
                            });
                        }
                    });
        }, function (err) {
            if (err) {
                done.forEach(function (itm) { itm.save({ scoring: {} }); });
                res.json({ message: err ? err : "Subordinate appraisal could not be completed.", sucess: false });
            } else { workflow.completed = done; workflow.emit('updateSummary'); }
        });
    });
    workflow.on('updateSummary', function () {
        var value = req.app.kenna.utility.calculateScore(workflow.sum, workflow.unit);
        req.app.db.models.EmployeeAppraisal
                .findOneAndUpdate({ employee: workflow.empId, period: workflow.period.id },
                { kra: { list: workflow.completed, score: value.score, text: value.text, date: new Date() } },
                function (e, r) {
                    workflow.outcome.success = true;
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
// Performing Subordinate KRA Appraisal
exports.getSubAppraisals = function (req, res) {
    var data = { isOpen: false, period: {}, subs: [] };// sub :{appraised, kras:[]}
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
                    var subData = { kras: [] };
                    async.parallel([
                                function (cbx) {
                                    req.app.db.models.Employee.findById(sub, 'firstName lastName designation department')
                                            .populate('department')
                                            .exec(function (er, emp) {
                                                if (er) { cbx(); }
                                                else {
                                                    subData.emp = {
                                                        code: emp.id,
                                                        name: emp.fullName(),
                                                        desig: emp.designation,
                                                        dept: emp.department.name
                                                    };
                                                    cbx();
                                                }
                                            })
                                }, function (cbx) {
                                    req.app.db.models.EmployeeAppraisal
                                            .findOne({ employee: sub, period: data.period.id }, 'kra',
                                            function (e, r) {
                                                if (r) { subData.text = r.kra.text; }
                                                cbx();
                                            });
                                },
                                function (cbx) {
                                    req.app.db.models.KraAppraisal
                                            .find({ employee: sub, period: data.period.id },
                                            '-details.catW -period -employee')
                                            .exec(function (er, kas) {
                                                if (er) cbx('An error occurred while retrieving kra appraisal data.');
                                                else if (kas.length > 0) {
                                                    var item = kas[0].scoring;
                                                    subData.kras = us.groupBy(kas, function (o) { return o.details.area; });
                                                    subData.appraised = !!(item.score && item.by && item.date, item.text);
                                                    if (subData.appraised) { subData.date = item.date; subData.by = item.by; }
                                                    cbx();
                                                }
                                                else { subData.kras = []; subData.appraised = false; cbx(); }
                                            });
                                }
                            ], function () { data.subs.push(subData); cb(); }
                    );
                }, function () {
                    res.json(data);
                });
            }
        });
    }

    if (req.user.employee.isASupervisor()) getData();
    else res.status(403).send('Employee is not a supervisor.');
};
// KRA Appraisal Summary
exports.getKraSummary = function (req, res) {
    res.json([]);
};

