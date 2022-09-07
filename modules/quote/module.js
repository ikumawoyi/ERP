module.exports = function (app, mongoose) {
    require('./models')(app, mongoose);
    var controller =  require('./controller');

    app.get('/dayquote', controller.getTodaysQuote);
    app.get('/quotes', app.ensureQuote,  controller.getQuotes);
    app.post('/quotes', app.ensureQuote, controller.saveQuote);
};