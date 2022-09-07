module.exports = function (app, mongoose) {
    require('./models')(app, mongoose);
    var controller = require('./controller.js');

    app.post('/employee', app.ensureEmpRecord, controller.createEmployee);
    app.get('/employee', app.ensureEmpRecord, controller.getActiveEmployees);
    app.get('/employee/card', app.ensureEmpRecord, controller.getActiveEmployeesForCard);
    app.get('/employee/exited', app.ensureEmpRecord, controller.getExitedEmployees);
    app.put('/employee', controller.updateEmployee);

    app.put('/employee/experience', controller.editExperience);
    app.put('/employee/education', controller.editEducation);
    app.put('/employee/skill', controller.editSkill);
    app.put('/employee/dependant', controller.editDependant);
    app.post('/employee/picture', controller.changePicture);
};