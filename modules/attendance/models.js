
'use strict';
var constants = require('../../public/javascripts/constants.json');
module.exports = function (app, mongoose) {
    var loginInfoSchema = new mongoose.Schema({
        employeeId: { type: String, required: true },
        name: { type: String, required: true },
        department: { type: String, required: true },
        date: { type: Date, required: true, default: new Date(new Date().toDateString()) },
        time: { type: String, required: true },
        status: { type: String, required: true, enum: constants.loginStatus },
        endPoint: String
    });
    app.db.model('LoginInfo', loginInfoSchema);
    var attendanceSchema = new mongoose.Schema({
        employeeId: { type: String, required: true },
        name: { type: String, required: true },
        department: { type: String, required: true },
        date: { type: Date, required: true },
        time: { type: String },
        lateness: { type: Number, default: 0 },
        status: { type: String, required: true },
        note: String,
        pardon:{
            by: String,
            date: Date
        },
        reason: String
    });
    attendanceSchema.index({ date: 1, employeeId: 1 }, { unique: true });
    attendanceSchema.set('autoIndex', (app.get('env') === 'development'));
    app.db.model('Attendance', attendanceSchema);

    var systemRegSchema = new mongoose.Schema({
        systemName: { type: String, required: true },
        referenceNumber: {type:String, required: true},
        identification: { type: String, required: true },
        employeeId: { type: String, required: true },
        employeeName: { type: String, required: true },
        status: { type: String, default: 'Active', enum: ["Active", "Inactive", "Blocked"] },
        assignedBy: { type: String, default: "" },
        date: { type: Date, required: true },
        expires: { type: Date, required: true }
    });
    systemRegSchema.methods.getNextRef = function(cb){
        app.db.models.AttendanceSystem.find(function (err, pd) {
            if (err) cb(err);
            else {
                if (pd && pd.length > 0) {
                    var lastRefNo = pd[pd.length - 1].referenceNumber;
                    cb(null,'Ref-S-' + app.kenna.utility.pad(parseInt(lastRefNo.split('-')[2]) + 1));
                }
                else cb(null,'Ref-S-' + app.kenna.utility.pad(1));
            }
        })
    };
    systemRegSchema.methods.getEmployeeDetails = function (cb) {
        app.db.models.Employee.findOne({ employeeId: this.employeeId })
            .populate('department', 'name')
            .exec(function (err, result) {
                if (err) cb(undefined);
                else cb(result);
            });
    };
    //systemRegSchema.index({ employeeId: 1, status: 'Active' }, { unique: true });
    systemRegSchema.index({ referenceNumber: 1}, { unique: true });
    systemRegSchema.set('autoIndex', (app.get('env') === 'development'));
    app.db.model('AttendanceSystem', systemRegSchema);
};