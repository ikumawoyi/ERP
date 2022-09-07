'use strict';
module.exports = function (app, mongoose) {
    require('./models')(app, mongoose);
    var controller = require('./controller.js');

    app.get('/facility*', app.ensureAuthenticated);
    app.all('/facility/asset*', app.ensureFacility);

    app.get('/facility/asset', controller.getAllAssets);
    app.post('/facility/asset', controller.saveAsset);
    app.get('/facility/assettype', controller.getAllAssetTypes);
    app.post('/facility/assettype', controller.saveAssetType);
    app.get('/facility/assetlocation', controller.getAllAssetLocations);
    app.post('/facility/assetlocation', controller.saveAssetLocation);

    app.get('/facility/myasset', controller.getEmployeeAssets);
    app.post('/facility/newticket', controller.openNewTicket);
    app.post('/facility/replyticket', controller.replyOpenTicket);
    app.put('/facility/openticket', controller.modifyTicketStatus);

    app.get('/facility/sasset/:id', controller.assetDetails);
    app.get('/facility/hrassets',app.ensureAdmin, controller.getDashbordData);
};