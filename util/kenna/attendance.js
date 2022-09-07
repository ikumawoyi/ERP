module.exports = function (req) {
    var db = req.app.db || {};
    var attendance = new (require('events').EventEmitter)() || {};
    function pad(n) {return ('00' + n).slice(-2);}
    attendance.status = '';
    function reset(d) { d.setMinutes(0); d.setSeconds(0); d.setMilliseconds(0); }
    function getTime() {
        var time = new Date();
        var hr = time.getHours(); var min = time.getMinutes();
        var tt = 12;
        return (tt == 12) ? pad(hr == 0 ? 12 : hr <= 12 ? hr : hr - 12) + ':' + pad(min) + (hr >= 12 ? 'PM' : 'AM') : pad(hr) + ':' + pad(min);
    }
    function getLateness() {
        if (attendance.status == 'Late') {
            var late = new Date(); late.setSeconds(0); late.setMilliseconds(0); late.setHours(8); late.setMinutes(15);
            return ((new Date() - late) / 60000).toFixed();
        }
        else return 0;
    }

    function canMarkAtt() {
        var time = new Date();
        var isWeekend = time.getDay() == 0 || time.getDay() == 6;
        if (isWeekend) return false;
        else if (req.app.isHoliday) return false;
        var start = new Date(); reset(start); start.setHours(6);
        var late = new Date(); reset(late); late.setHours(8); late.setMinutes(15);
        var absent = new Date(); reset(absent); absent.setHours(13);
        var endOfDay = new Date(); reset(endOfDay); endOfDay.setHours(24);
        if (time > start && time < absent) {
            attendance.status = late > new Date() ? 'On Time' : 'Late';
            return true;
        } else return false;
    }
    var start = new Date(); reset(start); start.setHours(6);
    var late = new Date(); reset(late); late.setHours(8); late.setMinutes(15);
    var absent = new Date(); reset(absent); absent.setHours(13);
    var endOfDay = new Date(); reset(endOfDay); endOfDay.setHours(24);

    attendance.possible = ["On Time", "Late", "Absent", 'Non Work', 'Not Mapped'];
    attendance.on('userLoggedIn', function (user, provision) {
        attendance.user = user.employee;
        db.models.Employee.findById(attendance.user).populate('department').exec(function (e, p) {
            if (p && p.status != 'Inactive') {
                attendance.user = p;
                if(canMarkAtt()) return (user.employee == (req.app.pd || {}).id) ? attendance.emit('checkCurrentState') : attendance.emit('checkSystemStatus', provision);
            }
        })
    });
    attendance.on('checkCurrentState', function () {
        var date = new Date(new Date().toDateString());
        db.models.Attendance
            .findOne({ employeeId: attendance.user.employeeId, date: date })
            .exec(function (err, atd) {
                if (err);
                else if (atd) {
                    if (atd.status == 'N/A') {
                        atd.status = attendance.status;
                        atd.time = getTime(); atd.lateness = getLateness();
                        atd.save(function (err) {
                            if (err);
                        });
                    }
                }
                else {
                    var fields = {
                        employeeId: attendance.user.employeeId,
                        name: attendance.user.fullName(),
                        department: attendance.user.department.name,
                        date: new Date(new Date().toDateString()),
                        time: getTime(), lateness: getLateness(),
                        status: attendance.status
                    };
                    db.models.Attendance.create(fields, function (err, atd) { });
                }
            });
    });
    attendance.on('checkSystemStatus', function (provision) {
        if (provision) {
            var ref = JSON.parse(provision).ref;
            req.app.db.models.AttendanceSystem.findOne({ referenceNumber: ref, status: 'Active'/*, employeeId: attendance.user.employeeId */}, function (e, t) {
                if (t) attendance.emit('checkCurrentState');
            });
        }
    });
    attendance.on('checkLeaveStatus', function () {
        console.log('check Leave Status called');
    });
    return attendance;
};