module.exports = function (app, mongoose) {
    require('./models')(app, mongoose);
    var controller = require('./controller.js');

    app.get('/appraisal/performances', controller.getPerformanceHistory);

    app.get('/appraisal/competence', controller.getCompetenceCategory);
    app.post('/appraisal/competence', controller.saveCompetenceQ);
    app.post('/appraisal/competencea', controller.saveCompetenceCategory);
    app.get('/appraisaldata/competence', controller.getCompetenceReport);
    app.post('/appraisaldata/subcompetence', app.ensureSupervisor, controller.performSubCompetenceAppraisal);
    app.get('/appraisaldata/subcompetence', app.ensureSupervisor, controller.getSubCompetences);
    app.get('/appraisal/competences', controller.getCompetenceReports);
    app.recalculate = controller.recalculateCompetence;
    app.get('/appraisal/recalculate/competence', controller.recalculateCompetence);
    app.get('/appraise/recalculate', controller.recalculateCompetence);
    app.get('/appraisal/recalculate/count', function(rq, rs){rs.json({count: rq.app.recalculationCount});});
    app.post('/appraisaldata/delete/competences', controller.deleteAppraisalForEmployee);
};