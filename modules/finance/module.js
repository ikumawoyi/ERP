/**
 * Created by toluogunremi on 5/22/15.
 */
'use strict';
module.exports = function (app, mongoose) {
    require('./models')(app, mongoose);
    var controller = require('./controller.js');

    app.post('/finance/cashrequest', controller.makeCashRequest);
    app.post('/finance/approvecash', controller.approveCashRequest);
    app.post('/finance/declinecash', controller.declineCashRequest);

    app.get('/finance/financecash', app.ensureFinance, controller.getCashRequestAsFinance);
    app.post('/finance/cashreleased', app.ensureFinance, controller.approvedCashReleased);
    app.post('/finance/cashretired',app.ensureFinance, controller.approvedCashSettled);

    app.post('/finance/pdapprovecash', app.ensureCashApproval, controller.approveCashRequestAsPD);
    app.post('/finance/pddeclinecash', app.ensureCashApproval, controller.declineCashRequestAsPD);

    app.post('/finance/cashreleasedmtd', controller.cashdisbursementsMTD);
    app.post('/finance/cashreleasedytd',app.ensureAdmin, controller.cashdisbursementsYTD);
    app.get('/finance/cashreport',app.ensureAdmin, controller.cashdisbursements);
};