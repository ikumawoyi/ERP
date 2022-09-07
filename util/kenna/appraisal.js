/**
 * Created by Ubiri Uzoezi on 27/04/2015.
 */
/**
 * Module to handle setting up all appraisal related information for all employees.
 * @param {Object} app
 * The server varialble
 */
module.exports = function (app) {
    var kenna = new (require('events').EventEmitter)();
    //kenna = {};
    var async = require("async");
    var temp = {};
    /**
     *
     * @param {function} cb The callback in the form callback([])
     */
    function getAssessment(cb) {
        app.db.models.SelfAssessmentQ.find(function (err, saq) {
            temp.assessments = err ? [] : saq; cb();
        })
    }
    /**
     *
     * @param {function} cb The callback in the form callback([])
     */
    function getCompetence(cb) {
        app.db.models.PerformanceCompetenceQ.find()
                .populate('category', '-questions')
                .exec(function (err, saq) {
                    temp.competences = err ? [] : saq;
                    cb();
                })
    }
    /**
     *
     * @param {function} cb The callback to continue execution with
     */
    function getEvaluation(cb) {
        app.db.models.SupervisorEvaluationArea.find(function (err, saq) {
            var evals = {}; saq = err ? [] : saq;
            saq.forEach(function (itm) { evals[itm.title] = { more: itm.description, scoreText: '' }; });
            temp.evaluations = evals; cb();
        })
    }
    /**
     * Prepares the confirmation object and pass it to the callback
     * 
     * @param {Object} The employee object to be appraised for confirmation
     * 
     * @callback The callback is in the form @param {Object} err Contains error information, null if action succeeds
     */
    function getConfirmation(emp, callback) {
        app.db.models.ConfirmationArea.find({ departments: emp.department }, function (err, saq) {
            var evals = {}; saq = err ? [] : saq;
            saq.forEach(function (itm) { evals[itm.area] = { header: itm.header, scoreText: '' }; });
            var conEval = {
                employee: emp.id,
                details: evals,
                date: new Date(new Date().toDateString())
            }; callback(conEval);
        });
    };
    function setupEmployeeAppraisal(emp, cbx) {
        function continueProcess(empApp) {
            async.parallel(
                [
                    //function (cb) {
                    //    app.db.models.PerformanceCompetence
                    //        .find({ employee: emp.id, period: temp.period.id },
                    //        function (r, apps) {
                    //            if (!r) {
                    //                empApp.competence = { list: apps }; cb(null, 'competence');
                    //            } else cb(null, 'competence');
                    //        })
                    //},
                    function (cb) {
                        app.db.models.SupervisorEvaluation
                            .find({ supervisor: emp.id, period: temp.period.id },
                            function (r, apps) {
                                if (!r) {
                                    empApp.evaluation = { list: apps }; cb(null, 'evaluation');
                                } else cb(null, 'evaluation');
                            });
                    },
                    function (cb) {
                        app.db.models.SelfAssessment.find({ employee: emp.id, period: temp.period.id },
                            function (r, apps) {
                                if (!r) {
                                    empApp.assessment = { list: apps }; cb(null, 'assessment');
                                } else cb(null, 'assessment');
                            });
                    },
                    function (cb) {
                        app.db.models.KraAppraisal.find({
                            employee: emp.id, period: temp.period.id
                        }, function (r, apps) {
                            if (!r) {
                                empApp.kra = { list: apps }; cb(null, 'kra');
                            } else cbx(null, 'kra');
                        });
                    }
                ],
                function (err, results) {
                    empApp.save(function (er) { cbx(er || err); });
                });
        }
        app.db.models.EmployeeAppraisal
            .findOne({ employee: emp.id, period: temp.period.id },
            function (error, empApp) {
                if (empApp) continueProcess(empApp); else {
                    app.db.models.EmployeeAppraisal
                        .create({ employee: emp.id, period: temp.period.id },
                        function (er, empApp) {
                            if (empApp) continueProcess(empApp);
                            else cbx(er);
                        });
                }
            });
    };
    kenna.on('appraisalInitiated', function (period) {
        temp.period = period;
        console.log('Starting Execution');
        kenna.start = new Date().getTime();
        function gg() {
            kenna.getAllEmployees(function (emps) {
                temp.employees = emps;
                async.each(temp.employees, function (item, cbx) {
                    async.parallel(
                        [
                            function (cb) {
                                kenna.setupKra(item, function (err) {
                                    cb(err, 'kra');
                                });
                            },
                            function (cb) {
                                kenna.setupSelfAssessment(item, function (err) {
                                    cb(err, 'assessment');
                                });
                            },
                            //function (cb) {
                            //    kenna.setupCompetence(item, function (err) {
                            //        cb(err, 'competence');
                            //    });
                            //},
                            function (cb) {
                                if (item.isASupervisor())
                                    kenna.setupSubEvaluation(item, function (err) {
                                        cb(err, 'evaluation');
                                    });
                                else cb(null, 'eval');
                            }
                        ],
                        function (err, result) {
                            setupEmployeeAppraisal(item, function (er) {
                                cbx(err); //final callback for parallel
                            });
                        });
                }, function (err) {
                    console.log('All task completed for all employees.');
                    if (err) console.log(err);
                    kenna.end = new Date().getTime();
                    console.log('start: %d, end: %d, difference: %d', kenna.start, kenna.end, kenna.end - kenna.start);
                });
            });
        }
        async.parallel(
            [
                function (cb) {
                    getAssessment(function () {
                        cb(null, 'assessment');
                    });
                },
                //function (cb) {
                //    getCompetence(function () {
                //        cb(null, 'competence');
                //    });
                //},
                function (cb) {
                    getEvaluation(function () {
                        cb(null, 'evaluation');
                    });
                }
            ],
            function (err, result) {
                console.log('err: %s \n result: %s', err, result);
                gg();
            });
    });
    kenna.on('confirmationInitiated', function (emp, appraisers) {
        var async = require('async');
        async.parallel(
            [
                function (cb) { getConfirmation(emp, function (conf) { cb(null, conf); }); },
                function (cb) { getAppraisers(appraisers, function (emps) { cb(null, emps); }); }
            ],
            function (err, results) {
                async.each(results[1],
                    function (appr, cb) { kenna.setupConfirmation(results[0], appr, cb, emp); },
                    function (err, cb) {
                        kenna.emit('confirmationRequestCompleted');
                    });
            });
    });
    /**
     * @description
     *
     * Setup KRA Appraisal for an employee
     *
     * @param {Object} emp The employee whose kra appraisal is to be setup
     * 
     * @param {function} cbx The callback in the form callback([])
     */
    kenna.setupKra = function (emp, cbx) {
        function q(kra, cb) {
            var kraAppraisal = {
                employee: emp.id,
                details: {
                    id: kra.id,
                    kra: kra.description,
                    area: kra.area.name,
                    catW: kra.weight
                },
                period: temp.period.id,
                date: new Date(new Date().toDateString())
            };
            app.db.models.KraAppraisal
                .create(kraAppraisal, function (err) { cb(err); });
        }
        app.db.models.KRA.find({ department: emp.department.id,/**/designations: emp.designation })
            .populate('area', '-kras')
            .exec(function (err, saq) {
                if (saq && saq.length > 0) {
                    async.each(saq, q, function (err) {
                        cbx(err);
                    });
                } else cbx();
            })
    };
    //  more: ['Currently', '3 years from now', 'What can be done to accomplish your long-term career objectives?']
    kenna.setupSelfAssessment = function (emp, cbx) {
        function q(sas, cb) {
            var SelfAssessment = {
                employee: emp.id,
                question: {
                    id: sas.id,
                    text: sas.question,
                    isCareer: sas.isCareer
                },
                period: temp.period.id,
                date: new Date(new Date().toDateString())
            };
            app.db.models.SelfAssessment.create(SelfAssessment, function (err) { cb(err); });
        }
        async.each(temp.assessments, q, function (err) { cbx(err); });
    };
    kenna.setupCompetence = function (emp, cbx) {
        function q(com, cb) {
            var catW = (((com.category.filter || {})[emp.department.name] || {})[emp.designation] || com.category.weight);
            var qetW = (((com.category.filter || {})[emp.department.name] || {})[emp.designation] || com.weight);
            var PerformanceCompetence = {
                employee: emp.id,
                details: {
                    id: com.id,
                    category: com.category.header,
                    description: com.description,
                    name: com.name,
                    catW: catW,
                    qetW: qetW
                },
                period: temp.period.id,
                date: new Date(new Date().toDateString())
            };
            app.db.models.PerformanceCompetence.create(PerformanceCompetence, function (err) { cb(err); });
        }
        async.each(temp.competences, q, function (err) { cbx(err); });
    };
    kenna.setupSubEvaluation = function (emp, cbx) {
        function q(sub, cb) {
            var SupervisorEvaluation = {
                name: emp.fullName(),
                supervisor: emp.id,
                subordinate: sub,
                details: temp.evaluations,
                period: temp.period.id,
                date: new Date(new Date().toDateString())
            };
            app.db.models.SupervisorEvaluation.create(SupervisorEvaluation, function (err) { cb(err); });
        }
        async.each(emp.subordinates, q, function (err) { cbx(err); });
    };
    kenna.setupConfirmation = function (conf, appr, cb, emp) {
        var confirmation = JSON.parse(JSON.stringify(conf));
        confirmation.appraiser = appr.id;
        app.db.models.ConfirmationAppraisal.create(confirmation, function (err) {
            if (!err) app.utility.notify.emit('confirmationRequest',emp, appr);
            cb(err);
        });
    }
    kenna.getAllEmployees = function (cb) {
        app.db.models.Employee.find({status: {$ne: 'Inactive'}})
            .populate('department')
            .exec(function (e, emp) {
                if (e); else cb(emp);
            });
    };
    var getAppraisers = function (emps, cb) {
        app.db.models.Employee.find({ _id: { $in: emps || [] }, status: {$ne: 'Inactive'} }, 'firstName lastName employeeId')
            .exec(function (e, emp) { if (e) cb([]); else cb(emp); });
    };
    return kenna;
};