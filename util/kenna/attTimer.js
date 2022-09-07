/**
 * Created by Ubiri Uzoezi on 16/04/2015.
 */

module.exports = function (app) {
    //#region Attendance - Main
    var timer = new (require('events').EventEmitter)();

    function reset(d) {
        d.setMinutes(0);
        d.setSeconds(0);
        d.setMilliseconds(0);
    }

    app.recalculationCount = {
        today: 0, total: 0
    }
    function startTimer() {
        app.utility.auto();
        app.recalculationCount.today = 0;
        timer.date = new Date(new Date().toDateString());
        console.log('Timer ' + (timer.started ? 're' : '') + 'started' + ' - ' + timer.date);
        timer.currentState = '';
        var endOfDay = new Date();
        reset(endOfDay);
        endOfDay.setHours(24);
        var time = new Date();
        var isWeekend = time.getDay() == 0 || time.getDay() == 6;
        if (!isWeekend) {
            app.db.models.Holiday
                .find({$and: [{start: {$lte: timer.date}}, {resumption: {$gt: timer.date}}]})
                .exec(function (e, h) {
                    if (h && h.length == 0) {
                        getEmpsOnLeave(function () {
                            console.log('Employees on leave: ',JSON.stringify(app.onLeave));
                            var start = new Date();
                            reset(start);
                            start.setHours(6);
                            var late = new Date();
                            reset(late);
                            late.setHours(8);
                            late.setMinutes(15);
                            var absentOthers = new Date();
                            reset(absentOthers);
                            absentOthers.setHours(9);
                            var absent = new Date();
                            reset(absent);
                            absent.setHours(13);
                            //if (time < late - 300000) setTimeout(function () { app.setupAs(); }, late - 300000 - time);
                            //else if (time.getHours() + time.getMinutes() / 60 < 18) app.setupAs();

                            if (time < start) setTimeout(early, start - time);
                            else if (time < late) timer.currentState = 'On Time';

                            if (time < late) setTimeout(lateHandler, late - time);
                            else if (time < absent) lateHandler();

                            if (time < absentOthers) setTimeout(absentHandlerOthers, absentOthers - time);
                            else if (time < absent) checkNonCounsel();

                            if (time < absent) setTimeout(absentHandler, absent - time);
                            else if (time.getHours() + time.getMinutes() / 60 < 18) checkAllEmployeesForAbsentiesm();
                        });
                        app.recalculate({app: app});
                    } else app.isHoliday = h && h.length > 0;
                });
        } else app.recalculate({app: app});
        setTimeout(newDay, endOfDay - time + 2000);
        timer.started = true;
    };
    //#endregion

    //#region Attendance - Handlers
    function early() {
        timer.currentState = 'On Time';
    };
    function lateHandler() {
        timer.currentState = 'Late';
        timer.emit('latenessPrompt');
    };
    function absentHandler() {
        timer.currentState = 'Absent';
        timer.emit('absentPrompt');
    };
    function absentHandlerOthers() {
        timer.currentState = 'Absent';
        timer.emit('absentPromptOthers');
    };
    function newDay() {
        timer.currentState = '';
        startTimer();
    };
    //#endregion

    //#region Attendance - Lateness
    timer.on('markSingleEmployeeLate', function (item) {
        app.db.models.Attendance.findOne({date: timer.date, employeeId: item.employeeId})
            .exec(function (err, emp) {
                if (!err && !emp) {
                    var fields = {
                        employeeId: item.employeeId,
                        name: item.fullName(),
                        department: item.department.name,
                        date: timer.date,
                        status: 'N/A'
                    };
                    app.db.models.Attendance.create(fields, function (err, atd) {
                        if (!err) return timer.emit('promptSuperiorForLateness', item);
                    });
                }
            });
    });
    timer.on('latenessPrompt', function () {
        app.db.models.Employee.find({status: {$ne: 'Inactive'}, _id: {$nin: app.onLeave}, access: {$ne: 'M'}})
            .populate('department', 'name')
            .populate('supervisor', 'firstName lastName wEmail pEmail')
            .exec(function (err, emps) {
                if (err) return timer.emit('latenessPrompt');
                else emps.forEach(function (item) {
                    //if (item.id == (app.pd || {}).id) return;
                    timer.emit('markSingleEmployeeLate', item, true);
                });
            });
    });
    timer.on('promptSuperiorForLateness', function (emp) {
        app.utility.notify.emit('latenessPrompt', emp);
    });
    //#endregion

    //#region Attendance - Absent Non-Counsel
    function checkNonCounsel() {
        console.log('Check All Non Counsel');
        app.db.models.Organisation.findOne({name: 'Counsel'}, function (e, org) {
            if (org) {
                app.db.models.Employee.find({
                        department: {$ne: org.id},
                        status: {$ne: 'Inactive'},
                        _id: {$nin: app.onLeave},
                        access: {$ne: 'M'}
                    })
                    .populate('department', 'name')
                    .populate('supervisor', 'firstName lastName wEmail pEmail')
                    .exec(function (err, emps) {
                        if (err) return checkNonCounsel();
                        else emps.forEach(function (item) {
                            timer.emit('markSingleEmployeeAbsent', item);
                        });
                    });
            } else {
                console.log('Organisation "Counsel" not found.');
                checkAllEmployeesForAbsentiesm();
            }
        });

    }

    timer.on('absentPromptOthers', function () {
        console.log('mark Absent Employees (Non-Counsel)');
        app.db.models.Attendance.find({date: timer.date, status: 'N/A', department: {$ne: 'Counsel'}})
            .exec(function (err, atds) {
                if (!err) {
                    atds.forEach(function (item) {
                        item.status = 'Absent';
                        item.save(function () {
                            app.db.models.Employee.findOne({
                                    employeeId: item.employeeId,
                                    status: {$ne: 'Inactive'},
                                    _id: {$nin: app.onLeave},
                                    access: {$ne: 'M'}
                                })
                                .populate('department', 'name')
                                .populate('supervisor', 'firstName lastName wEmail pEmail')
                                .exec(function (er, emp) {
                                    if (emp) timer.emit('promptSuperiorForAbsentiesm', emp);
                                });
                        });
                    });
                }
            });
    });
    //#endregion

    function getEmployee(id, empId) {

    }

    function getEmpsOnLeave(cb) {
        var date = new Date();
        app.db.models.LeaveRequest.find({
            status: 'Approved',
            start: {$lte: date},
            resumption: {$gt: date}
        }, 'employee requester', function (err, lvs) {
            app.onLeave = (lvs || []).map(function (i) {
                return i.employee.toString();
            });
            cb();
        });
    }

    //#region Attendance - Absent Counsel + Others
    function checkAllEmployeesForAbsentiesm() {
        console.log('Check All');
        app.db.models.Employee.find({status: {$ne: 'Inactive'}, _id: {$nin: app.onLeave}, access: {$ne: 'M'}})
            .populate('department', 'name')
            .populate('supervisor', 'firstName lastName wEmail pEmail')
            .exec(function (err, emps) {
                if (err) return checkAllEmployeesForAbsentiesm();
                else emps.forEach(function (item) {
                    timer.emit('markSingleEmployeeAbsent', item);
                });
            });
    }

    timer.on('markSingleEmployeeAbsent', function (item) {
        app.db.models.Attendance.findOne({date: timer.date, employeeId: item.employeeId})
            .exec(function (err, emp) {
                if (emp) {
                    if (['On Time', 'Late', 'Absent'].indexOf(emp.status) == -1) {
                        emp.status = 'Absent';
                        emp.save(function () {
                            timer.emit('promptSuperiorForAbsentiesm', item);
                        });
                    }
                } else if (!err) {
                    var fields = {
                        employeeId: item.employeeId,
                        name: item.fullName(),
                        department: item.department.name,
                        date: timer.date,
                        status: 'Absent'
                    };
                    app.db.models.Attendance.create(fields, function (err, atd) {
                        if (err) return; else timer.emit('promptSuperiorForAbsentiesm', item);
                    });
                }
            });
    });
    timer.on('absentPrompt', function () {
        console.log('mark Absent Employees ( Counsel + Others)');
        app.db.models.Attendance.find({date: timer.date, status: 'N/A'})
            .exec(function (err, atds) {
                if (!err) {
                    atds.forEach(function (item) {
                        item.status = 'Absent';
                        item.save(function () {
                            app.db.models.Employee.findOne({
                                    employeeId: item.employeeId,
                                    status: {$ne: 'Inactive'},
                                    _id: {$nin: app.onLeave},
                                    access: {$ne: 'M'}
                                })
                                .populate('department', 'name')
                                .populate('supervisor', 'firstName lastName wEmail pEmail')
                                .exec(function (er, emp) {
                                    if (emp) timer.emit('promptSuperiorForAbsentiesm', emp);
                                });
                        });
                    });
                }
            });
    });
    timer.on('promptSuperiorForAbsentiesm', function (emp) {
        app.utility.notify.emit('absentPrompt', emp);
    });
    //#endregion

    startTimer();
}