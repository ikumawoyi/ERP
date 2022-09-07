module.exports = function (app, mongoose) {
    require('./assessment/module.js')(app, mongoose);
    require('./competence/module')(app, mongoose);
    require('./confirmation/module')(app, mongoose);
    require('./kra/module')(app, mongoose);
    require('./evaluation/module')(app, mongoose);

    require('./models')(app, mongoose);
    var controller = require('./controller.js');

    app.get('/appraisal/current', controller.currentPeriod);
    app.post('/appraisal/initiate', app.ensureAdmin, controller.initiateAppraisalPeriod);
    app.post('/appraisal/extend', app.ensureAdmin, controller.extendAppraisalPeriod);
};