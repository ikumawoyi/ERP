module.exports = function (app, mongoose) {
    require('./models')(app, mongoose);
    var controller = require('./controller');

 app.get('/appraisaldata/subevaluations', app.ensureSupervisor, controller.getEvaluationBySubordinates);
 app.get('/appraisaldata/evaluatesup', controller.getEvaluationForMySupervisor);
    app.post('/appraisaldata/evaluatesup', controller.performEvaluateSupervisor);

    app.get('/appraisal/evaluation', controller.getEvaluationArea);
    app.post('/appraisal/evaluation', controller.saveEvaluationArea);
    app.get('/appraisal/evaluations', controller.getEvaluationReports);
};