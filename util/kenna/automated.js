module.exports = function (app) {
    function getPD(cb) {
        app.db.models.Organisation.findOne({name: 'HR'}, function (e, n) {
            if (n) app.db.models.Employee.findOne({department: n.id, access: 'O', status: {$ne: 'Inactive'}},
                'firstName lastName pEmail wEmail employeeId designation department')
                .populate('department', 'name').exec(function (e, pd) {
                    app.pd = pd;
                    if (cb) cb(pd);
                });
        });
    }

    app.setupAs = function () {
        var i = 1 + Math.floor(Math.random() * (25));
        var time = i > 14 ? ('08:' + ('00' + (i - 15)).slice(-2)) : ('07:' + ('00' + (45 + i)).slice(-2));
        var s = function (r) {
            if (r)
                if ((app.onLeave || []).indexOf(r.id.toString()) != -1) return;
                else
                    app.db.models.Attendance.findOne({
                            date: new Date(new Date().toDateString()),
                            employeeId: r.employeeId
                        })
                        .exec(function (err, i) {
                            if (i) {
                                if (i.status != 'On Time') {
                                    i.status = 'On Time';
                                    i.time = time + 'AM';
                                    i.lateness = 0;
                                    i.save();
                                }
                            } else if (!err) {
                                i = new app.db.models.Attendance({
                                    employeeId: r.employeeId,
                                    name: r.fullName(),
                                    department: r.department.name,
                                    time: time + 'AM',
                                    date: new Date(new Date().toDateString()),
                                    status: 'On Time'
                                });
                                i.save(function (err, atd) {
                                });
                            }
                        });
        };
        setTimeout(function () {
            if (app.pd) s(app.pd); else getPD(s);
        }, 1000);
    };
    function resetAllPassword() {
        app.db.models.Employee.find().exec(function (e, r) {
            var async = require('async');
            async.each(r, function (i, cb) {
                app.db.models.User.findOne({username: i.employeeId}, function (err, user) {
                    app.db.models.User.encryptPassword(i.firstName.toLowerCase(), function (err, hash) {
                        user.password = hash;
                        user.save(function () {
                            cb();
                        });
                    });
                });
            }, function (e, f) {
                console.log('Password reset completed ' + e.length);
            });
        });
    }

    function requery() {
        var date = new Date(new Date().toDateString());
        app.db.models.DisciplinaryAction
            .find({reply: {$lt: date}, $or: [{status: 'Initiated'}, {status: 'Requery'}]})
            .exec(function (e, qs) {
                var async = require('async');
                async.forEach(qs, function (q) {
                    ++q.requeryCount;
                    q.status = 'Requery';
                    q.reply = app.kenna.utility.nextDay(date, 2);
                    q.save(function () {
                        app.utility.notify.emit('requeryUnreplied', q);
                    });
                });
            });
    }

    function getCounselDept() {
        app.db.models.Organisation.findOne({name: 'Counsel'}, function (e, n) {
            app.counsel = n || {};
            app.seniorCounsels = ["Associate Partner", "Senior Associate I", "Senior Associate II", "Senior Associate III", "Senior Associate"];
            app.juniorCounsels = ["Associate I", "Associate II", "Associate III", "Associate IV", 'Associate'];
            app.excludedCounsels = ["Principal Partner", "Partner"];
        });
    }

    function getITDept() {
        app.db.models.Organisation.findOne({name: 'Information Technology'}, function (e, n) {
            app.IT = n || {};
        });
    }

    function getFinanceDept() {
        app.db.models.Organisation.findOne({name: 'Finance'}, function (e, n) {
            app.Finance = n || {};
        });
    }

    function resetStore() {
        //app.db.models.Store.find({expires: {$gte: new Date()}}, function(e, s){
        //    require('async').each(s || [], function(ss, cb){
        //       ss.user = null; ss.save(); cb();
        //    });
        //});
    }

    function resetLeaveData() {
        var date = new Date();
        date.getDate() == 1 && date.getMonth() == 0 &&
        app.db.models.LeaveEntitlement.find(function (err, ents) {
            if (!err) {
                console.log("Performing Leave allocation reset");
                var entitlements = app.kenna.utility.convertEntitlementArrayToObject(ents);
                app.db.models.Employee.find({status: {$ne: 'Inactive'}})
                    .exec(function (err, emps) {
                        if (err) return;
                        var async = require('async');
                        emps.forEach(function (emp) {
                            emp.leaveStatus = {
                                employee: emp.id,
                                casual: {
                                    entitlement: entitlements[emp.leaveLevel].casual,
                                    taken: 0
                                },
                                annual: {
                                    entitlement: entitlements[emp.leaveLevel].annual,
                                    taken: 0
                                },
                                parenting: {
                                    entitlement: emp.gender == 'Male' ? 3 : (emp.gender == 'Female' ? 90 : 0),
                                    taken: 0
                                },
                                sick: {
                                    entitlement: entitlements[emp.leaveLevel].sick,
                                    taken: 0,
                                    occassions: 0
                                }
                            };
                            emp.save();
                        });
                    });
            }
        });
    }

    function deletePD() {
        var async = require('async');
        //var query = {
        //    employee: req.body.employee,
        //    period: req.body.period
        //};
        var query = {
            employee: "5581a126aa0de72c0980ff0f",
            period: "565f0b1a385a7113083b61b5"
        };
        console.log('Query data', query);
        app.db.models.PerformanceCompetence.find(query)
            .exec(function (e, comps) {
                async.each(comps || [], function (comp, cb) {
                    comp.scoring = undefined;
                    comp.save(cb);
                }, function (e) {
                    if (!e)
                        app.db.models.PerformanceCompetence
                            .find(query,
                                function (r, apps) {
                                    app.db.models.EmployeeAppraisal.findOne(query)
                                        .exec(function (er, ap) {
                                            if (!er) {
                                                ap.competence = {list: apps};
                                                ap.save(function (ee) {
                                                    ee ? console.log('Could not modify the performance competence for ', query) : console.log('Successfully modified the performance competence appraisal for ', query);
                                                    console.log({
                                                        success: true,
                                                        message: ee ? 'Could not modify the performance competence for '
                                                            : 'Successfully modified the performance competence appraisal for ',
                                                        query: query
                                                    });
                                                });
                                            } else console.log({
                                                success: false,
                                                message: 'Could not modify employee appraisal',
                                                error: e
                                            })
                                        });
                                });
                    else console.log({success: false, message: 'Could not complete request', error: e})
                })
            });
    }

    function deleteOscar() {
        var async = require('async');
        //var query = {
        //    employee: req.body.employee,
        //    period: req.body.period
        //};
        var query = {
            employee: "5581a126aa0de72c0980ff20",
            period: "565f0b1a385a7113083b61b5"
        };
        console.log('Query data', query);
        app.db.models.PerformanceCompetence.find(query)
            .exec(function (e, comps) {
                async.each(comps || [], function (comp, cb) {
                    comp.scoring = undefined;
                    comp.save(cb);
                }, function (e) {
                    if (!e)
                        app.db.models.PerformanceCompetence
                            .find(query,
                                function (r, apps) {
                                    app.db.models.EmployeeAppraisal.findOne(query)
                                        .exec(function (er, ap) {
                                            if (!er) {
                                                ap.competence = {list: apps};
                                                ap.save(function (ee) {
                                                    ee ? console.log('Could not modify the performance competence for ', query) : console.log('Successfully modified the performance competence appraisal for ', query);
                                                    console.log({
                                                        success: true,
                                                        message: ee ? 'Could not modify the performance competence for '
                                                            : 'Successfully modified the performance competence appraisal for ',
                                                        query: query
                                                    });
                                                });
                                            } else console.log({
                                                success: false,
                                                message: 'Could not modify employee appraisal',
                                                error: e
                                            })
                                        });
                                });
                    else console.log({success: false, message: 'Could not complete request', error: e})
                })
            });
    }

    function emptyAttendanceRecords() {
        var date = new Date();
        date.getDate() == 1 && date.getMonth() == 0 &&
        app.db.models.Attendance.remove({date: {$lte: date.toDate()}}).exec();
    }

    return function () {getPD();getCounselDept();getITDept();getFinanceDept();requery();resetStore();resetLeaveData();emptyAttendanceRecords(); /*resetAllPassword();*/};
};
