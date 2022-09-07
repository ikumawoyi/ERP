module.exports = function (app, mongoose) {
    require('./models')(app, mongoose);
    var controller = require('./controller.js');

   // app.get('/appraisal/disciplines', controller.getDisciplinaryActions);

    app.get('/appraisal/disciplines', controller.getDisciplinaryActions);
    app.get('/appraisaldata/subactions', controller.getSubDisciplinaryActions);
    app.post('/appraisaldata/squery', controller.sendQuery);
    app.get('/appraisaldata/queries', controller.getMyDisciplinaryActions);
    app.post('/appraisaldata/rqueries', controller.replyQuery);

};