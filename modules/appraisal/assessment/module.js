module.exports = function (app, mongoose) {
    require('./models')(app, mongoose);
    var controller = require('./controller.js');

    app.get('/appraisaldata/assessment', controller.getSelfAssessment);
    app.post('/appraisaldata/assessment', controller.performSelfAssessment);

    app.get('/appraisal/assessments', controller.getAssessmentReports);
    app.get('/appraisal/assessment', controller.getAssessmentQ);
    app.post('/appraisal/assessment', controller.saveAssessmentQ);
};