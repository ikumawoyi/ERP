/**
 * Created by toluogunremi on 5/22/15.
 */
'use strict';
module.exports = function (app, mongoose) {
    var pettyCashSchema = new mongoose.Schema({
        referenceNumber: {type: String},
        requester: {type: String, required: true},
        dateRequested: {type: Date, default: new Date()},
        employee: {type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true},
        description: String,
        incurred: {type: Date, required: true},
        disbursed: Date,
        amount: {type: Number, required: true},
        status: {
            type: String,
            enum: ["Pre-Approval", "Awaiting PD's Approval", "Approved", "Cash Released", "Disapproved", "Retired"]
        },
        priority: {type: String, enum:app.constants.priorities},
        preApproval: {type: String},
        toApprove: {type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true},
        payTo: {type: String, required: true},
        requesterNotes: {type: String, required: true},
        pdNotes: {type: String, default: ''},
        modeOfPayment: {type: String},
        stages: String,
        cashReleasedBy: String,
        cashReleaseCode: {type: mongoose.Schema.Types.ObjectId, ref: 'Employee'},
        amountRetired: Number
    });
    app.db.model('PettyCash', pettyCashSchema);
};