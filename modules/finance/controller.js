'use strict';

exports.getCashRequestAsFinance = function (req, res) {
    //req.app.db.models.PettyCash
    //    .find({ $or: [{ status: 'Approved' }, { status: 'Cash Released' }, { status: 'Retired' }] }, function (err, pc) {
    //        if (err) res.json([]);
    //        else {
    //            res.json(require('underscore').groupBy(pc, 'status'));
    //        }
    //    });
    req.app.db.models.PettyCash
        .aggregate([
            {
                $match: { $or: [{ status: 'Approved' }, { status: 'Cash Released' }, { status: 'Retired' }] }
            },
            {
                $group: {
                    _id: { month: { $month: "$dateRequested" }, year: { $year: "$dateRequested" }, status: "$status" },
                    item: { $push: "$$CURRENT"}
                }
            },
            {
                $project: {
                    _id: 0,
                    month: "$_id.month", year: "$_id.year", status: "$_id.status",
                    requests: "$item"
                }
            },
            {
                $group: {
                    _id: { month: "$month", year: "$year" },
                    status: { $push: "$$CURRENT" }
                }
            },
            {
                $project: {
                    _id: 0,
                    month: "$_id.month", year: "$_id.year", status: 1
                }
            },
            {
                $group: {
                    _id: "$year",
                    months: { $push: "$$CURRENT" },
                    min: { $min: "$month" },
                    max: { $max: "$month" }
                }
            },
            { $sort: { _id: -1 } }], function (err, pc) {
            if (err) res.json([]);
            else {
                res.json(pc);
            }
        });
};
exports.approvedCashReleased = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('checkrequestStatus', function () {
        req.app.db.models.PettyCash.findById(req.body._id, function (err, pc) {
            if (err) {
                workflow.outcome.errors.push('Could not retrieve cash request details. Try again later');
                return workflow.emit('response');
            }
            else if (pc) {
                var t;
                switch (pc.status) {
                    case 'Pre-Approval': t = 'Cannot release cash for a request awaiting pre-approval'; break;
                    case 'Awaiting PD\'s Approval': t = 'Cannot release cash for a request awaiting PD\'s approval'; break;
                    case 'Cash Released': t = 'Cash has already been release for this request'; break;
                    case 'Retired': t = 'Cash has already been release for this request and it has been marked as Retired'; break;
                    case 'Disapproved': 'Cannot release cash for a dissapproved request'; break;
                    default: break;
                }
                if (t) {
                    workflow.outcome.errors.push(t);
                    return workflow.emit('response');
                }
                else {
                    workflow.cashR = pc; workflow.emit('markAsReleased');
                }
            } else {
                workflow.outcome.errors.push('Request was not found.');
                return workflow.emit('response')
            }
        });
    });

    workflow.on('markAsReleased', function () {
        workflow.cashR.status = 'Cash Released'; workflow.cashR.cashReleasedBy = req.user.employee.fullName();
        workflow.cashR.cashReleaseCode = req.user.employee.id; workflow.cashR.disbursed = new Date();
        workflow.cashR.modeOfPayment = req.body.modeOfPayment ? req.body.modeOfPayment : 'Cash';
        workflow.cashR.save(function (err, pc) {
            if (err) workflow.outcome.errors.push('An error occurred while saving the request. Try again later');
            else {
                workflow.outcome.success = true;
                workflow.outcome.message = 'Request marked as released';
                req.app.utility.notify.emit('cashRequestStatusChanged', pc, req.user);
            } return workflow.emit('response');
        });
    });
    workflow.emit('checkrequestStatus');
};
exports.approvedCashSettled = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var amountRetired = req.body.amountRetired || 0;
    workflow.on('checkrequestStatus', function () {
        req.app.db.models.PettyCash.findById(req.body._id, function (err, pc) {
            if (err) {
                workflow.outcome.errors.push('Could not retrieve cash request details. Try again later');
                return workflow.emit('response');
            }
            else if (pc) {
                var t;
                switch (pc.status) {
                    case 'Pre-Approval': t = 'Cannot retire a request awaiting pre-approval'; break;
                    case 'Awaiting PD\'s Approval': t = 'Cannot retire a request awaiting PD\'s approval'; break;
                    case 'Approved': t = 'Cannot retire a request when cash has not been released'; break;
                    case 'Disapproved': t = 'Cannot retire a dissapproved request'; break;
                    case 'Retired': t = 'Cannot retire an already retired request'; break;
                    default:
                        if(amountRetired > pc.amount) t = 'Cannot retire an amount more than what was released.';
                        else{
                            pc.amount -= amountRetired;
                            pc.amountRetired = amountRetired;
                        }
                        break;
                }
                if (t) {
                    workflow.outcome.errors.push(t);
                    return workflow.emit('response');
                }
                else {
                    workflow.cashR = pc; workflow.emit('markAsRetired');
                }
            } else {
                workflow.outcome.errors.push('Request was not found.');
                return workflow.emit('response')
            }
        });
    });
    workflow.on('markAsRetired', function () {
        workflow.cashR.status = 'Retired';

        workflow.cashR.save(function (err, pc) {
            if (err) workflow.outcome.errors.push('An error occurred while saving the request. Try again later');
            else {
                workflow.outcome.success = true;
                workflow.outcome.message = 'Request marked as retired';
                req.app.utility.notify.emit('cashRequestStatusChanged', pc, req.user);
            } return workflow.emit('response');
        });
    });
    workflow.emit('checkrequestStatus');
};

exports.makeCashRequest = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);

    workflow.on('validate', function () {
        var cashR = req.body;
        cashR.pdNotes = '';
        cashR.status = 'Pre-Approval';
        try {
            cashR.employee = req.user.employee.id;
            cashR.requester = req.user.employee.fullName();
        } catch (e) { }
        ['description', 'incurred', 'amount', 'requesterNotes', 'requester', 'employee', 'payTo']
            .forEach(function (item) {
                if (!cashR[item])
                    workflow.outcome.errfor[item] = 'required';
            });
        ['code', 'employeeId', 'name']
            .forEach(function (item) {
                if (!cashR.toApprove[item])
                { workflow.outcome.errfor.toApprove = 'Invalid supervisor'; }
            });
        ['disbursed', 'modeOfPayment', 'stages', 'dateRequested', '_id', 'preApproval', 'cashReleasedBy', 'cashReleaseCode']
            .forEach(function (item) {
                if (cashR[item]) delete cashR[item];
            });
        if (workflow.hasErrors()) {
            workflow.outcome.errors.push('Please ensure that all required fields are entered.');
            return workflow.emit('response');
        }
        else {
            workflow.cashR = cashR;
            workflow.emit('verifySuperior');
        }
    });
    workflow.on('verifySuperior', function () {
        req.app.db.models.Employee.findOne({ employeeId: workflow.cashR.toApprove.employeeId }, function (err, emp) {
            if (err) {
                workflow.outcome.errors.push('Could not verify pre-approving officer.');
                return workflow.emit('response');
            }
            else if (emp && req.user.employee.access > emp.access) {
                workflow.cashR.toApprove = emp.id;
                workflow.supervisor = emp.fullName();
                workflow.emit('getNextReference');
            }
            else {
                workflow.outcome.errors.push(emp ? (emp.fullName() + ' cannot pre-approve your request') : 'Selected pre-approving officer was not found');
                return workflow.emit('response');
            }
        });
    });
    workflow.on('getNextReference', function () {
        req.app.db.models.PettyCash.find(function (err, pd) {
            if (err) return workflow.emit('exception', err);
            else {
                if (pd && pd.length > 0) {
                    var lastRefNo = pd[pd.length - 1].referenceNumber;
                    workflow.cashR.referenceNumber = 'Ref-' + req.app.kenna.utility.pad(parseInt(lastRefNo.split('-')[1]) + 1);
                }
                else workflow.cashR.referenceNumber = 'Ref-' + req.app.kenna.utility.pad(1);
                workflow.emit('createRequest');
            }
        })
    });
    workflow.on('createRequest', function () {
        req.app.db.models.PettyCash.create(workflow.cashR, function (err, cash) {
            if (err) { return workflow.emit('exception', err); }
            else {
                workflow.outcome.success = true;
                workflow.outcome.message = 'Cash Request was successfully made';
                req.app.utility.notify.emit('cashRequestStatusChanged', cash, req.user, workflow.supervisor);
                workflow.emit('response');
            }
        });
    });
    workflow.emit('validate');
};
exports.approveCashRequest = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('checkrequestStatus', function () {
        req.app.db.models.PettyCash
            .findById(req.body._id).populate('employee')
            .exec(function (err, pc) {
                if (err) {
                    workflow.outcome.errors.push('Could not retrieve cash request details. Try again later');
                    return workflow.emit('response');
                } else if (pc) {
                    var t;
                    switch (pc.status) {
                        case 'Pre-Approval': case 'Disapproved': break;
                        case 'Awaiting PD\'s Approval': t = 'Request has been pre-approved by ' + pc.preApproval; break;
                        case 'Approved': t = 'Request already approved by PD.'; break;
                        case 'Cash Released': t = 'Cash has already been release for this request'; break;
                        case 'Retired': t = 'Cash has already been release for this request and it has been marked as retired'; break;
                        default: break;
                    }
                    if (t) {
                        workflow.outcome.errors.push(t);
                        return workflow.emit('response');
                    }
                    else if (req.user.employee.access < pc.employee.access && pc.toApprove == req.user.employee.id) {
                        pc.preApproval = req.user.employee.fullName(); workflow.cashR = pc; workflow.emit('preapprove');
                    } else {
                        workflow.outcome.errors.push('You cannot pre-approve a request of' + pc.requester);
                        return workflow.emit('response');
                    }
                }
                else {
                    workflow.outcome.errors.push('Request was not found.');
                    return workflow.emit('response')
                }
            });
    });
    workflow.on('preapprove', function () {
        workflow.cashR.status = 'Awaiting PD\'s Approval';
        workflow.cashR.save(function (err, p) {
            if (err) {
                workflow.outcome.errors.push('An error occurred while approving the request. Try again later');
                return workflow.emit('response');
            }
            else {
                workflow.outcome.success = true;
                workflow.outcome.message = 'Cash Request was successfully approved';
                req.app.utility.notify.emit('cashRequestStatusChanged', p, req.user);
                workflow.emit('response');
            }
        });
    });
    workflow.emit('checkrequestStatus');
};
exports.declineCashRequest = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('checkrequestStatus', function () {
        req.app.db.models.PettyCash
            .findById(req.body._id)
            .populate('employee')
            .exec(function (err, pc) {
                if (err) {
                    workflow.outcome.errors.push('Could not retrieve cash request details. Try again later');
                    return workflow.emit('response');
                } else if (pc) {
                    var t;
                    switch (pc.status) {
                        case 'Pre-Approval': case 'Disapproved': break;
                        case 'Awaiting PD\'s Approval': t = 'Request has been pre-approved by ' + pc.preApprovedBy; break;
                        case 'Approved': t = 'Request already approved by PD.'; break;
                        case 'Cash Released': t = 'Cash has already been release for this request'; break;
                        case 'Retired': t = 'Cash has already been release for this request and it has been marked as retired'; break;
                        default: break;
                    }
                    if (t) {
                        workflow.outcome.errors.push(t);
                        return workflow.emit('response');
                    }
                    else if (req.user.employee.access < pc.employee.access && pc.toApprove == req.user.employee.id) {
                        workflow.cashR = pc; workflow.emit('decline');
                    } else {
                        workflow.outcome.errors.push('You cannot pre-approve a request of' + pc.employee.fullName());
                        return workflow.emit('response');
                    }
                }
                else {
                    workflow.outcome.errors.push('Request was not found.');
                    return workflow.emit('response')
                }
            });
    });
    workflow.on('decline', function () {
        workflow.cashR.status = 'Disapproved';
        workflow.cashR.save(function (err, s) {
            if (err) {
                workflow.outcome.errors.push('An error occurred while approving the request. Try again later');
                return workflow.emit('response');
            }
            else {
                workflow.outcome.success = true;
                workflow.outcome.message = 'Cash Request has been declined';
                req.app.utility.notify.emit('cashRequestStatusChanged', s, req.user);
                workflow.emit('response');
            }
        });
    });
    workflow.emit('checkrequestStatus');
};

exports.approveCashRequestAsPD = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('checkrequestStatus', function () {
        req.app.db.models.PettyCash
            .findById(req.body._id).populate('employee')
            .exec(function (err, pc) {
                if (err) {
                    workflow.outcome.errors.push('Could not retrieve cash request details. Try again later');
                    return workflow.emit('response');
                } else if (pc) {
                    var t;
                    switch (pc.status) {
                        case 'Pre-Approval': case 'Disapproved': case 'Awaiting PD\'s Approval': break;
                        case 'Approved': t = 'Request already approved.'; break;
                        case 'Cash Released': t = 'Cash has already been release for this request'; break;
                        case 'Retired': t = 'Cash has already been release for this request and it has been marked as Retired'; break;
                        default: break;
                    }
                    if (t) {
                        workflow.outcome.errors.push(t);
                        return workflow.emit('response');
                    }
                    else {
                        if (req.body.pdNotes) pc.pdNotes = req.body.pdNotes;
                        pc.status = 'Approved';
                        workflow.cashR = pc; workflow.emit('approve');
                    }
                }
                else {
                    workflow.outcome.errors.push('Request was not found.');
                    return workflow.emit('response')
                }
            });
    });
    workflow.on('approve', function () {
        workflow.cashR.save(function (err, p) {
            if (err) {
                workflow.outcome.errors.push('An error occurred while approving the request. Try again later');
                return workflow.emit('response');
            }
            else {
                workflow.outcome.success = true;
                workflow.outcome.message = 'Cash Request was successfully approved';
                req.app.utility.notify.emit('cashRequestStatusChanged', workflow.cashR, req.user);
                workflow.emit('response');
            }
        });
    });
    workflow.emit('checkrequestStatus');
};
exports.declineCashRequestAsPD = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('checkrequestStatus', function () {
        req.app.db.models.PettyCash
            .findById(req.body._id)
            .exec(function (err, pc) {
                if (err) {
                    workflow.outcome.errors.push('Could not retrieve cash request details. Try again later');
                    return workflow.emit('response');
                } else if (pc) {
                    var t;
                    switch (pc.status) {
                        case 'Pre-Approval': case 'Awaiting PD\'s Approval': case 'Approved': break;
                        case 'Disapproved': t = 'Cash request has already been disapproved'; break;
                        case 'Cash Released': t = 'Cash has already been release for this request'; break;
                        case 'Retired': t = 'Cash has already been release for this request and it has been marked as Retired'; break;
                        default: break;
                    }
                    if (t) {
                        workflow.outcome.errors.push(t);
                        return workflow.emit('response');
                    }
                    else {
                        if (req.body.pdNotes) pc.pdNotes = req.body.pdNotes;
                        pc.status = 'Disapproved';
                        workflow.cashR = pc; workflow.emit('decline');
                    }
                }
                else {
                    workflow.outcome.errors.push('Request was not found.');
                    return workflow.emit('response')
                }
            });
    });
    workflow.on('decline', function () {
        workflow.cashR.save(function (err, pc) {
            if (err) {
                workflow.outcome.errors.push('An error occurred while approving the request. Try again later');
                return workflow.emit('response');
            }
            else {
                workflow.outcome.success = true;
                workflow.outcome.message = 'Cash Request has been declined';
                req.app.utility.notify.emit('cashRequestStatusChanged', pc, req.user);
                workflow.emit('response');
            }
        });
    });
    workflow.emit('checkrequestStatus');
};

exports.cashdisbursementsMTD = function (req, res) {
    var date = new Date();
    if (req.body.date) date = new Date(req.body.date);
    var start = new Date(date.getFullYear(), date.getMonth(), 1);
    var end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    req.app.db.models.PettyCash
        .aggregate([
            { $match: { $or: [{ status: 'Cash Released' }, { status: "Retired" }], disbursed: { $gte: start, $lt: end } } },
            { $group: { _id: { $dayOfMonth: "$disbursed" }, total: { $sum: "$amount" } } },
            { $sort: { _id: 1 } }], function (err, pc) {
                if (err)
                    res.json([]);
                else
                    res.json(pc);
            });
};
exports.cashdisbursements = function (req, res) {
    var date = new Date();
    if (req.body.date) date = new Date(req.body.date);
    var start = new Date(date.getFullYear(), date.getMonth(), 1);
    var end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    req.app.db.models.PettyCash
        .aggregate([
            { $match: { $or: [{ status: 'Cash Released' }, { status: "Retired" }] } },
            {
                $group: {
                    _id: { day: { $dayOfMonth: "$disbursed" }, month: { $month: "$disbursed" }, year: { $year: "$disbursed" } },
                    amount: { $sum: "$amount" }
                }
            },
            {
                $project: {
                    _id: 0,
                    day: "$_id.day", month: "$_id.month", year: "$_id.year",
                    amount: 1
                }
            },
            {
                $group: {
                    _id: { month: "$month", year: "$year" },
                    amount: { $sum: "$amount" },
                    days: { $push: "$$CURRENT" }
                }
            },
            {
                $project: {
                    _id: 0,
                    month: "$_id.month", year: "$_id.year",
                    amount: 1,
                    days: 1
                }
            },
            {
                $group: {
                    _id: "$year",
                    amount: { $sum: "$amount" },
                    months: { $push: "$$CURRENT" },
                    min: { $min: "$month" },
                    max: { $max: "$month" }
                }
            },
            { $sort: { _id: -1 } }], function (err, pc) {
                if (err)
                    res.json([]);
                else
                    res.json(pc);
            });
};

exports.cashdisbursementsYTD = function (req, res) {
    var date = new Date();
    if (req.body.date) date = req.body.date;
    var start = new Date(date.getFullYear(), 0, 1);
    var end = new Date(date.getFullYear() + 1, 0, 1);
    req.app.db.models.PettyCash
        .aggregate([
            { $match: { $or: [{ status: 'Cash Released' }, { status: "Retired" }], disbursed: { $gte: start, $lt: end } } },
            { $group: { _id: { $month: "$disbursed" }, total: { $sum: "$amount" } } },
            { $sort: { _id: 1 } }
        ],
        function (err, pc) {
            if (err)
                res.json([]);
            else
                res.json(pc);
        });
};


exports.getAttendanceReport = function (req, res) {
    var date = new Date();
    var d = date.getDate();
    var m = date.getMonth();
    var y = date.getFullYear();
    date = new Date(y, m, d);
    var us = require('underscore');
    req.app.db.models.Attendance
            .aggregate([
                {
                    $group: {
                        _id: { month: { $month: "$date" }, year: { $year: "$date" }, id: "$employeeId" },
                        name: { $last: "$name" }, department: { $last: "$department" },
                        days: { $push: "$$ROOT" }
                    }
                },
                {
                    $project: {
                        year: "$_id.year",
                        _id: 0,
                        id: "$_id.id",
                        month: "$_id.month",
                        name: 1, department: 1,
                        days: 1
                    }
                },
                {
                    $group: {
                        _id: { month: "$month", year: "$year" },
                        employees: { $push: "$$ROOT" }
                    }
                },
                {
                    $project: {
                        year: "$_id.year",
                        _id: 0,
                        month: "$_id.month",
                        employees: 1
                    }
                },
                {
                    $group: {
                        _id: "$year",
                        max: { $max: "$month" },
                        min: { $min: "$month" },
                        months: { $push: "$$CURRENT" }
                    }

                },
                { $sort: { _id: -1 } }
            ],
            function (err, pc) {
                if (err) res.json([]);
                else res.json(pc);
            });
};