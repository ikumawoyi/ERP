
'use strict';
module.exports = function (app, mongoose) {
    require('./models')(app, mongoose);
    var controller = require('./controller.js');

    app.get('/attendance/subtoday', app.ensureSupervisor, controller.getSubAttendanceForToday);
    app.post('/attendance/subtoday', app.ensureSupervisor, controller.getSubAttendanceForToday);
    app.put('/attendance/subtoday/:id', app.ensureSupervisor, controller.pardonSubLateness);

    app.get('/attendance/myattendance',app.ensureAuthenticated, controller.getMyAttendanceRecord);
    app.put('/attendance/myattendance/:id',app.ensureAttendanceOwn, controller.replyLateness);

    app.post('/attendance/alltoday',app.ensureAttendance, controller.getAttendanceRecordForDate);
    app.get('/attendance/attendancerep',app.ensureAttendance, controller.getAttendanceReport);
    app.put('/attendance/pardon/:id',app.ensureAttendance, controller.pardonLateness);

    app.get('/attendance/provisions',app.ensureIT, controller.getProvisions);
    app.post('/attendance/provisions',app.ensureIT, controller.provisionLoginSystem);
    app.put('/attendance/provisions/:id',app.ensureIT, controller.updateSystemReg);

    app.get('/attendance/state', controller.checkSystemStatus);
};