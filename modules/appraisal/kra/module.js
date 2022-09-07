module.exports = function (app, mongoose) {
    require('./models')(app, mongoose);
    var controller = require('./controller.js');

    app.get('/appraisal/kraareas', controller.getKraAsAdMin);
    app.post('/appraisal/addarea', controller.addKraArea);
    app.post('/appraisal/savekra', controller.saveKRA);
    app.get('/appraisal/kraappraisals', controller.getKraReports);

    app.post('/appraisaldata/achievement', controller.performAddKraAchievement);
    app.put('/appraisaldata/achievement', app.ensureSupervisor, controller.performKraAppraisal);

    app.get('/appraisal/krasums', controller.getKraSummary);
    app.get('/appraisaldata/appraisal', controller.getKraAppraisal);
    app.get('/appraisaldata/subappraisal', app.ensureSupervisor, controller.getSubAppraisals);
};