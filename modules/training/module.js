module.exports = function (app, mongoose) {
    require('./models')(app, mongoose);
    var controller = require('./controller.js');

    app.all('/training*', app.ensureTraining);
    app.get('/trainings', controller.getTrainings);
    app.post('/trainings', controller.saveTraining);
    app.put('/trainings', controller.submitTrainingScore);
};