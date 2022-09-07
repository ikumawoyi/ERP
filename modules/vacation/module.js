
'use strict';
module.exports = function (app, mongoose) {
    require('./models')(app, mongoose);
    var controller = require('./controller.js');

    app.get('/vacation/leaverequests', controller.getLeaveRequestsAsPD);
    app.all('/vacation*', app.ensureAuthenticated);
    app.all('/vacation/reallocatelevel*', app.ensureAdmin);
    app.all('/vacation/allocateleave*', app.ensureAdmin);
    app.all('/vacation/pd*', app.ensureAdmin);

    app.get('/vacation/entitlement', controller.getEntitlements);
    app.get('/vacation/entitlementg', controller.getEntitlementsInGroup);
    app.post('/vacation/entitlement', controller.saveEntitlement);

    app.post('/vacation/reallocatelevel', controller.reallocateLeaveLevel);
    app.post('/vacation/allocateleave', controller.allocateLeave);

    app.post('/vacation/leaverequest', controller.makeLeaveRequest);
    app.post('/vacation/approveleave', controller.approveLeaveRequest);
    app.post('/vacation/declineleave', controller.declineLeaveRequest);

    app.put('/vacation/pdupdate', controller.updateLeaveRequest);
    app.post('/vacation/pdapproveleave', controller.approveLeaveRequestAsPD);
    app.post('/vacation/pddeclineleave', controller.declineLeaveRequestAsPD);
};