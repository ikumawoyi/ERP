module.exports = function (app, mongoose) {
    require('./models')(app, mongoose);
    var controller = require('./controller.js');

    app.get('/download/kradefs', controller.downloadKraDefinations);
    app.get('/download/kradata', controller.downloadKraData);
}