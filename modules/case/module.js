module.exports = function (app, mongoose) {
    app = app || {};
    require('./models')(app, mongoose);
    var controller = require('./controller.js');
    app.all('/case*', app.ensureAuthenticated);
    app.get('/case/icases', app.ensureTeamLeader, controller.getDataForTeamLeader);
    app.post('/case/icases', app.ensureTeamLeader, controller.saveCase);
    app.get('/case/mycases', app.ensureCounsel, controller.getCasesForCounsel);
    app.get('/case/reports', app.ensureAdmin, controller.activeCaseReports);
    app.get('/case/reports/:id', app.ensureAdmin, controller.activeCaseReports);
    app.post('/case/close/:id', app.ensurePD, controller.closeCase);
}