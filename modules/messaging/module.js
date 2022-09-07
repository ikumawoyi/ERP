module.exports = function (app, mongoose) {
    require('./models')(app, mongoose);
    var controller = require('./controller.js');
 app.get('/employee/messages', controller.getMessages);
}