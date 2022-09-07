var mL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var mS = ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
var isLeap = function (y) { return (y % 4 == 0 && y % 100 != 0) || (y % 100 == 0 && y % 400 == 0); }
function getLast(n, y) {
    var lastDay;
    switch (n) {
        case 3: case 5: case 8: case 10: lastDay = 30; break;
        case 0: case 2: case 4: case 6: case 7: case 9: case 11: lastDay = 31; break;
        case 1: if (isLeap(y)) lastDay = 29; else lastDay = 28; break; default: break;
    }
    return lastDay;
}
function getMonth(index) { return mS[index]; }
var lastWorkDay = function (time) {
    var isWeekend = time.getDay() == 0 || time.getDay() == 6;
    if (isWeekend) {
        return new Date(time.getFullYear(), time.getMonth(), time.getDate() - (time.getDay() == 0 ? 2 : 1));
    }
    return time;
}

exports.getMyAttendanceRecord = function (req, res) {
    var date = new Date();
    var d = date.getDate();
    var m = date.getMonth();
    var y = date.getFullYear();
    date = new Date(y, m, d);
    var us = require('underscore');
    req.app.db.models.Attendance
       .aggregate([
           {
               $match: {
                   date: { $gte: new Date(y, 0, 1), $lte: new Date(y, 11, 31, 23, 59, 59) },
                   employeeId: req.user.employee.employeeId
               }
           },
           {
               $group: {
                   _id: { month: { $month: "$date" }, year: { $year: "$date" } },
                   year: { $avg: { $year: "$date" } },
                   days: { $push: "$$ROOT" }
               }
           },
           {
               $project: {
                   year: 1,
                   _id: 0,
                   month: "$_id.month",
                   days: 1
               }
           },
          {
              $group: {
                  _id: "$year",
                  max: { $max: "$month" },
                  min: { $min: "$month" },
                  months: { $push: "$$CURRENT" }
              }

          },
           { $sort: { _id: -1 } }
       ],
       function (err, pc) {
           if (err)
               res.json([]);
           else
               res.json(pc);
       });
};
exports.getAttendanceRecordForDate = function (req, res) {
    var date = new Date(); req.app.kenna.utility.resetTime(date);
    if (req.body.date) {
        var q = new Date(req.body.date);
        date = lastWorkDay(q == 'Invalid Date' || q > date ? date : q);
        date.setHours(0);
        req.app.kenna.utility.resetTime(q);
    }
    req.app.db.models.Attendance.find({ date: date }, function (err, atds) {
        if (err) return res.status(500).send();
        else res.json({ success: true, att: atds, date: date });
    });
};
exports.getSubAttendanceForToday = function (req, res) {
    var date = new Date(new Date().toDateString());
    var async = require('async');
    var us = require('underscore');
    var data = [];
    var status = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, 15) > new Date()
        ? 'Pending' : new Date(date.getFullYear(), date.getMonth(), date.getDate(), 13, 0) > new Date()
        ? 'Late' : 'Absent';
    req.app.db.models.Employee.find(
        { _id: { $in: req.user.employee.subordinates }, status: {$ne: 'Inactive'} },
        'firstName lastName department employeeId')
        .populate('department', 'name')
        .exec(function (e, subs) {
            async
                .each(subs,
                    function (sub, cb) {
                        req.app.db.models.Attendance.findOne(
                            { date: date, employeeId: sub.employeeId }, '-note', function (err, atd) {
                                if (err) cb(err);
                                else if (atd) data.push(atd);
                                else data.push({
                                    employeeId: sub.employeeId,
                                    name: sub.fullName(),
                                    department: sub.department.name,
                                    date: date,
                                    time: 'NA',
                                    lateness: 0, test: '',
                                    status: ((req.app.onLeave || []).indexOf(sub.id.toString()) == -1) ?  status : 'On Leave'
                                });
                                cb();
                            });
                    },
                    function (err) {
                        if (err) res.status(500).send('Could not retrieve attendance record.')
                        else res.json(us.groupBy(data, 'status'));
                    });
        })
};
exports.getAttendanceReport = function (req, res) {
    req.app.db.models.Attendance
       .aggregate([
           {
               $group: {
                   _id: { month: { $month: "$date" }, year: { $year: "$date" }, id: "$employeeId" },
                   name: { $last: "$name" }, department: { $last: "$department" },
                   days: { $push: "$$ROOT" }
               }
           },
           {
               $project: {
                   year: "$_id.year",
                   _id: 0,
                   id: "$_id.id",
                   month: "$_id.month",
                   name: 1, department: 1,
                   days: 1
               }
           },
           {
               $group: {
                   _id: { month: "$month", year: "$year" },
                   employees: { $push: "$$ROOT" }
               }
           },
           {
               $project: {
                   year: "$_id.year",
                   _id: 0,
                   month: "$_id.month",
                   employees: 1
               }
           },
          {
              $group: {
                  _id: "$year",
                  max: { $max: "$month" },
                  min: { $min: "$month" },
                  months: { $push: "$$CURRENT" }
              }

          },
           { $sort: { _id: -1 } }
       ],
       function (err, pc) {
           if (err) res.json([]);
           else res.json(pc);
       });
};

exports.getAttendanceRecord = function (req, res) {
    var date = new Date();
    var d = date.getDate();
    var m = date.getMonth();
    var y = date.getFullYear();
    date = new Date(y, m, d);
    req.app.db.models.Attendance
       .aggregate([
           {
               $group: {
                   _id: { month: { $month: "$date" }, year: { $year: "$date" } },
                   year: { $avg: { $year: "$date" } },
                   days: { $push: "$$ROOT" }
               }
           },
           {
               $project: {
                   year: 1,
                   _id: 0,
                   month: "$_id.month",
                   days: 1
               }
           },
          {
              $group: {
                  _id: "$year",
                  max: { $max: "$month" },
                  min: { $min: "$month" },
                  months: { $push: "$$CURRENT" }
              }

          },
           { $sort: { _id: -1 } }
       ],
       function (err, pc) {
           if (err)
               res.json([]);
           else
               res.json(pc);
       });
};
exports.getSubAttendanceRecord = function (req, res) {
    var date = new Date();
    var d = date.getDate();
    var m = date.getMonth();
    var y = date.getFullYear();
    date = new Date(y, m, d);
    req.app.db.models.Supervisor.findOne({ employee: req.user.employee.id })
        .populate('subordinates', 'employeeId')
        .exec(function (err, r) {
            if (err) res.status(500).send();
            else if (r) {
                var q = [];
                r.subordinates.forEach(function (item) { q.push(item.employeeId); });
                req.app.db.models.Attendance.find({ date: { $gte: new Date(y, 0, 1), $lte: new Date(y, 11, 31, 23, 59, 59) }, employeeId: { $in: q } }, function (err, atds) {
                    if (err) return res.status(500).send();
                    else res.json(atds);
                });
            }
            else res.json([]);
        });
};
exports.getAttendanceRecordForYear = function (req, res) {
    var date = new Date();
    var d = date.getDate();
    var m = date.getMonth();
    var y = req.body; date = new Date(y, m, d);

    req.app.db.models.Attendance.find({ date: { $gte: new Date(y, 0, 1), $lte: new Date(y, 11, 31, 23, 59, 59) } }, function (err, atds) {
        if (err) return res.status(500).send();
        else res.send(atds);
    });
};
exports.getAttendanceRecordForDate3 = function (req, res) {
    var date = new Date();
    if (req.query)
        date = new Date(req.query);
    var d = date.getDate();
    var m = date.getMonth();
    var y = date.getFullYear();
    date = new Date(y, m, d);
    req.app.db.models.Attendance
        .aggregate([
            {
                $group: {
                    _id: { month: { $month: "$date" }, year: { $year: "$date" } },
                    year: { $avg: { $year: "$date" } },
                    days: { $push: "$$ROOT" }
                }
            },
            {
                $project: {
                    year: 1,
                    _id: 0,
                    month: "$_id.month",
                    days: 1
                }
            },
            {
                $group: {
                    _id: "$year",
                    max: { $max: "$month" },
                    min: { $min: "$month" },
                    months: { $push: "$$CURRENT" }
                }

            },
            { $sort: { _id: -1 } }
        ],
        function (err, pc) {
            if (err)
                res.json([]);
            else
                res.json(pc);
        });
};

exports.getProvisions = function (req, res) {
    var async = require('async');
    var data = {};
    async.parallel([
        function (cb) {
            req.app.db.models.AttendanceSystem
                .find(function (e, t) {
                    cb(e, t);
                });
        },
        function (cb) {
            req.app.db.models.Employee.find({status: {$ne: 'Inactive'}}, 'firstName lastName department designation employeeId')
                .populate('department', 'name designations')
                .exec(function (err, locs) {
                    var emps = [];
                    locs.forEach(function (emp) {
                        emps.push({
                            name: emp.fullName(), dept: emp.department.name, desig: emp.designation, _id: emp.id,
                            concat: emp.fullName() + ' (' + emp.department.name + ' - ' + emp.designation + ')',
                            empId: emp.employeeId
                        });
                    });
                    cb(null, emps);
                });
        }
    ], function (err, r) {
        if (err) res.status(500).send(err);
        else {
            r = r || [];
            data.systems = r[0]; data.emps = r[1];
            res.json(data);
        }
    });
};
exports.checkSystemStatus = function (req, res) {
    function clear() {
        res.clearCookie('provision');
    }
    res.cookie('connect.sid', '', {expires: new Date(1), path: '/' });

    if (req.signedCookies && req.signedCookies['connect.sid']) {
        req.sessionStore.getCollection(function (err, collection) {
            collection.remove({_id: req.signedCookies['connect.sid']}, {w: 0});
        });
    }
    function sendFalse() { res.json({ msg: 'This is NOT an authorized machine or browser for Attendance Tracking.' }); }
    if (req.signedCookies.provision) {
        var ref = JSON.parse(req.signedCookies.provision).ref;
        req.app.db.models.AttendanceSystem.findOne({ referenceNumber: ref }, function (e, t) {
            if (t && t.status == 'Active') res.json({ success: true });
            else sendFalse();
        });
    } else return sendFalse();
};
exports.updateSystemReg = function (req, res) {
    req.app.db.models.AttendanceSystem.findByIdAndUpdate(req.params.id, { status: req.body.status }, function (e, t) {
        if (e) res.status(500).send('An error occurred while modifying the record.')
        else if (t) res.json({ success: true, message: 'Record was successfully updated' });
        else res.json({ success: true, message: 'Record was not found' });
    });
};
exports.provisionLoginSystem = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('checkStatus', function () {
        if (req.signedCookies.provision) {
            var ref = JSON.parse(req.signedCookies.provision).ref;
                req.app.db.models.AttendanceSystem.findOne({ referenceNumber: ref }, function (e, t) {
                    if (t) {
                        workflow.outcome.errors.push('This system is already provisioned. <br/>Date: "' + t.date.toLocaleDateString() + '". By: "' + t.assignedBy + '". Current Status: "' + t.status + '". RefNo: "' + ref + '".');
                        return workflow.emit('response');
                    } else if (e) {
                        workflow.outcome.errors.push('Found provision data but could not verify.');
                        return workflow.emit('response');
                    } else workflow.emit('validate');
                });
           
        } else workflow.emit('validate');
    });
    workflow.on('validate', function () {
        var info = req.body;
        if (!info.systemName) workflow.outcome.errors.push('The system name field is required.');
        if (!info.employee || !info.employee._id) workflow.outcome.errors.push('The employee field is required.');
        if (workflow.hasErrors()) return workflow.emit('response');
        else {
            workflow.reg = info;
            workflow.emit('getEmployee');
        }
    });
    workflow.on('getEmployee', function () {
        req.app.db.models.Employee.findById(workflow.reg.employee._id, function (er, emp) {
            if (er || !emp) {
                workflow.outcome.errors.push(er ? 'An error occurred while retrieving details' : 'Employee was not found.');
                workflow.emit('response');
            } else {
                workflow.reg.employeeId = emp.employeeId;
                workflow.reg.employeeName = emp.fullName();
                workflow.emit('createSystemReg')
            }
        });
    });
    workflow.on('getToken', function () {
        var bcrypt = require('bcrypt-nodejs');
        bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                workflow.outcome.errors.push('The system name field is required.');
                workflow.emit('response');
            } else {
                // var data
                bcrypt.hash(pp, salt, null, function (err, hash) {
                    workflow.emit('createSystemReg')
                });
                res.cookie('provision', { item: workflow.info.employeeName, when: new Date() }, { maxAge: 3600000 * 24 * 10 })
            }
        });
    });
    workflow.on('createSystemReg', function () {
        var reg = new req.app.db.models.AttendanceSystem(workflow.req);
        reg.getNextRef(function (e, ref) {
            if (e) {
                workflow.outcome.errors.push('Could not provision the system for attendance management.');
                return workflow.emit('response');
            } else {
                reg.date = new Date();
                reg.employeeName = workflow.reg.employeeName;
                reg.employeeId = workflow.reg.employeeId;
                reg.systemName = workflow.reg.systemName;
                reg.identification = JSON.stringify({ item: reg.employeeName, ref: ref, when: reg.date });
                reg.referenceNumber = ref;
                reg.status = 'Active'; reg.assignedBy = req.user.employee.fullName();
                reg.expires = new Date(Date.now() + 3600000 * 24 * 365 * 40);
                reg.save(function (e, t) {
                    if (e) {
                        workflow.outcome.errors.push('Could not provision the system for attendance management.');
                        workflow.emit('response');
                    }
                    else {
                        res.cookie('provision', t.identification, { maxAge: 3600000 * 24 * 365 * 40, httpOnly: true, signed: true });
                        workflow.outcome.message = 'Provision Complete.';
                        workflow.emit('response');
                    }
                });
            }
        });
        //
    });
    workflow.emit('checkStatus');
};

exports.replyLateness = function (req, res) {
    if(!req.body.reason) return res.json({success:true, message: 'The reason for lateness is required.'});
    req.app.db.models.Attendance.findByIdAndUpdate(req.params.id, { reason: req.body.reason }, function (e, t) {
        res.json({ success: !e, message: 'lateness response successful.' });
    });
};
exports.pardonLateness = function (req, res) {
    req.app.db.models.Attendance.findByIdAndUpdate(req.params.id, { status: 'On Time', note: req.body.note, pardon: {by: req.user.employee.fullName(), date: new Date(new Date().toDateString())} }, function (e, t) {
        res.json({ success: !e, item: t, message: !e?'Lateness successfully pardoned.': 'Could not pardon lateness.' });
    });
};
exports.pardonSubLateness = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('modifyAttendance', function(){
        req.app.db.models.Attendance.findByIdAndUpdate(req.params.id, { status: 'On Time', note: req.body.note, pardon: {by: req.user.employee.fullName(), date: new Date(new Date().toDateString())} }, function (e, t) {
            res.json({ success: !e, item: t, message: !e?'Lateness successfully pardoned.': 'Could not pardon lateness.' });
        });
    });
    workflow.on('getRecord', function(){
        req.app.db.models.Attendance.findById(req.params.id, function (e, t) {
            workflow.record = t;
            if(t) return workflow.emit('getEmployee');
            res.json({ success: false, message: 'Attendance record was not found.' });
        });
    });
    workflow.on('getEmployee', function(){
        req.app.db.models.Employee.findOne({employeeId: workflow.record.employeeId, status: {$ne: 'Inactive'}}, function (e, t) {
            if(t && req.user.employee.subordinates.indexOf(t.id) != -1) return workflow.emit('modifyAttendance');
            res.json({ success: false, message: !t ? 'Employee record was not found.': 'Can only pardon lateness for team members' });
        });
    });
    workflow.emit('getRecord');
};
