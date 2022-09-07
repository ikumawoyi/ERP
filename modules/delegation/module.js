module.exports = function(app, mongoose){
    require('./models')(app, mongoose);
    var controller = require('./controller');

    app.get('/admin/tsk',controller.getDelegations);
    app.post('/admin/tsk', controller.saveNewDelegation);
    app.put('/admin/tsk', controller.updateDelegation);

}