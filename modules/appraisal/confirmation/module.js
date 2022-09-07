module.exports = function (app, mongoose) {
    require('./models')(app, mongoose);
    var controller = require('./controller.js');

    app.get('/appraisal/confirmations', controller.getconfirmationAppraisal)
    app.get('/appraisal/confirmation', controller.getConfirmationArea);
    app.post('/appraisal/confirmation', controller.saveConfirmationArea);
    app.get('/appraisal/unconfirmed', controller.getUnconfirmed);
    app.post('/appraisal/initiateconfirmation', controller.initiateConfirmation);

    app.get('/appraisaldata/assignedconfirmation', controller.getAssignedConfirmation);
    app.post('/appraisaldata/assignedconfirmation', controller.performConfirmationEvaluation);

    app.get('/confirmation/print/:id', app.ensurePD, controller.printConfirmation);
};