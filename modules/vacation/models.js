
'use strict';
module.exports = function (app, mongoose) {
    var leaveRequestSchema = new mongoose.Schema({
        referenceNumber: {type: String, required: true, unique: true},
        employee: {type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true},
        requester: {type: String, required: true},
        toApprove: {type: mongoose.Schema.Types.ObjectId, ref: 'Employee'},
        approvedBy: {type: String},
        type: {type: String, enum: app.constants.leaveTypes},
        start: {type: Date, required: true},
        resumption: {type: Date, required: true},
        days: {type: Number, required: true},
        status: {type: String, required: true, enum: ["Pre-Approval", "Approved", "Awaiting PD's Approval", 'Disapproved']},
        contact: {type: String, required: true},
        date: {type: Date, 'default': new Date()},
        byAdmin: {type: Boolean, 'default': false}
    });
    app.db.model('LeaveRequest', leaveRequestSchema);

    var leaveEntitlementSchema = new mongoose.Schema({
        name: { type: String, required: true },
        level: { type: String, required: true, enum: app.constants.levels },
        days: { type: Number, required: true },
        countType: { type: String, required: true, enum: app.constants.leaveConfig }
    });
    app.db.model('LeaveEntitlement', leaveEntitlementSchema);
};