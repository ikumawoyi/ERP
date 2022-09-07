
'use strict';

exports.getEntitlements = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('getData', function () {
        req.app.db.models.LeaveEntitlement.find(function (err, ents) {
            if (err) return workflow.emit('exception', err);
            else {
                workflow.result = ents;
                workflow.emit('sendResponse');
            }
        });
    });
    workflow.on('sendResponse', function () {
        res.json(workflow.result);
    });
    workflow.emit('getData');
};
exports.saveEntitlement = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var entitlement = req.body;
        ['days', 'level', 'name', 'countType']
            .forEach(function (item) {
                if (!entitlement[item])
                    workflow.outcome.errfor[item] = 'required';
            });
        if (workflow.hasErrors()) {
            workflow.outcome.errors.push('Please ensure that all required fields are entered.');
            return workflow.emit('response');
        }
        else {
            workflow.entitlement = entitlement;
            if (entitlement._id) workflow.emit('update'); else workflow.emit('create');
        }
    });
    workflow.on('create', function () {
        req.app.db.models.LeaveEntitlement.create(workflow.entitlement, function (err, item) {
            if (err) return workflow.emit('exception', err);
            else {
                workflow.outcome.message = 'Leave Entitlement Successfully created';
                workflow.outcome.success = true;
                workflow.emit('response');
            }
        });
    });
    workflow.on('update', function () {
        req.app.db.models.LeaveEntitlement.findByIdAndUpdate(workflow.entitlement._id, workflow.entitlement, function (err, item) {
            if (err) return workflow.emit('exception', err);
            else {
                workflow.outcome.message = 'Leave Entitlement Successfully updated';
                workflow.outcome.success = true;
                workflow.emit('response');
            }
        });
    });
    workflow.emit('validate');
};
exports.getEntitlementsInGroup = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('getData', function () {
        req.app.db.models.LeaveEntitlement.find(function (err, ents) {
            if (err) return workflow.emit('exception', err);
            else {
                workflow.result = ents;
                workflow.emit('sendResponse');
            }
        });
    });
    workflow.on('sendResponse', function () {
        res.json(req.app.kenna.utility.convertEntitlementArrayToObject(workflow.result));
    });
    workflow.emit('getData');
};

exports.reallocateLeaveLevel = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        workflow.changes = req.body; workflow.passed = workflow.failed = workflow.empty = 0;
        workflow.emit('getLeaveEntitlement');
    });
    workflow.on('getLeaveEntitlement', function () {
        req.app.db.models.LeaveEntitlement.find(function (err, ents) {
            if (err) return workflow.emit('exception', err);
            else {
                workflow.entitlements = req.app.kenna.utility.convertEntitlementArrayToObject(ents);
                workflow.emit('getEmployees');
            }
        });
    });
    workflow.on('saveEmployee', function (emp) {
        emp.save(function (err, item) {
            if (err) { workflow.failed += 1; complete(); }
            else { workflow.passed += 1; complete(); }
        });
    });
    function complete() {
        if (workflow.changes.length == (workflow.passed + workflow.failed + workflow.empty))
            workflow.emit('sendResponse');
    }
    workflow.on('modifySingle', function (item) {
        var q = req.app.db.models.Employee.findById(item._id);
        q.exec(function (err, emp) {
            if (err) { workflow.failed += 1; complete(); }
            else if (emp) {
                emp.leaveLevel = item.leaveLevel;
                if (emp.leaveStatus) {
                    emp.leaveStatus.casual = {
                        entitlement: workflow.entitlements[item.leaveLevel].casual,
                        taken: emp.leaveStatus.casual.taken || 0
                    }
                    emp.leaveStatus.annual = {
                        entitlement: workflow.entitlements[item.leaveLevel].annual,
                        taken: emp.leaveStatus.annual.taken || 0
                    }
                    emp.leaveStatus.sick = {
                        entitlement: workflow.entitlements[item.leaveLevel].sick,
                        taken: emp.leaveStatus.sick.taken || 0,
                        occassions: emp.leaveStatus.sick.occassions || 0
                    }
                    emp.leaveStatus.parenting = {
                        entitlement: emp.gender == 'Male' ? 3 : (emp.gender == 'Female' ? 90 : 0),
                        taken: emp.leaveStatus.parenting.taken || 0
                    }
                } else {
                    emp.leaveStatus = {
                        employee: emp.id,
                        casual: {
                            entitlement: workflow.entitlements[item.leaveLevel].casual,
                            taken: 0
                        },
                        annual: {
                            entitlement: workflow.entitlements[item.leaveLevel].annual,
                            taken: 0
                        },
                        parenting: {
                            entitlement: emp.gender == 'Male' ? 3 : (emp.gender == 'Female' ? 90 : 0),
                            taken: 0
                        },
                        sick: {
                            entitlement: workflow.entitlements[item.leaveLevel].sick,
                            taken: 0,
                            occassions: 0
                        }
                    }
                }
                workflow.emit('saveEmployee', emp);

            } else { workflow.empty += 1; complete(); }
        });
    });

    workflow.on('getEmployees', function () {
        workflow.changes.forEach(function (item) {
            workflow.emit('modifySingle', item);
        });
    });

    workflow.on('sendResponse', function () {
        if (workflow.passed > 0) {
            var y = "Reallocation complete. " + workflow.passed + ' successful';
            if (workflow.failed > 0)
                y += ' ' + workflow.failed + ' unsuccessful';
            workflow.outcome.message = y;
            workflow.outcome.success = true;
            workflow.emit('response');
        }
        else {
            workflow.outcome.errors.push('Could not complete action.');
            return workflow.emit('response');
        }
    });
    workflow.emit('validate');
}
exports.allocateLeave = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var leaveRequest = req.body.leave;
        ['start', 'resume', 'days', 'contact', 'type']
            .forEach(function (item) {
                if (!leaveRequest[item])
                    workflow.outcome.errfor[item] = 'required';
            });
        if (workflow.hasErrors()) {
            workflow.outcome.errors.push('Please ensure that all required fields are entered.');
            return workflow.emit('response');
        }
        else if (['Annual', 'Casual', 'Sick', 'Parenting'].indexOf(leaveRequest.type) == -1) {
            workflow.outcome.errors.push('Invalid leave type.');
            return workflow.emit('response');
        }
        else if (!req.body.employee || !req.body.employee._id) {
            workflow.outcome.errors.push('Unknown employee.');
            return workflow.emit('response');
        }
        else {
            leaveRequest.resumption = req.app.kenna.utility.nextDay(leaveRequest.start, leaveRequest.days, leaveRequest.type == 'Parenting').toDateString();
            leaveRequest.employee = req.body.employee._id;
            workflow.leaveR = leaveRequest;
            workflow.emit('confirmEmployee');
        }
    });
    workflow.on('confirmEmployee', function () {
        req.app.db.models.Employee.findById(workflow.leaveR.employee, function (err, emp) {
            if (err) {
                workflow.outcome.errors.push('Could not verify employee record.');
                return workflow.emit('response');
            }
            else if (emp) {
                workflow.leaveR.requester = emp.fullName(); workflow.leaveR.byAdmin = true; workflow.leaveR.status = 'Approved';
                workflow.employee = emp; workflow.leaveR.date = new Date();
                workflow.emit('verifyEntitlement', emp);
            }
            else {
                workflow.outcome.errors.push('Selected employee was not found');
                return workflow.emit('response');
            }
        });
    });
    workflow.on('verifyEntitlement', function () {
        req.app.db.models.LeaveEntitlement.find({ level: workflow.employee.leaveLevel }, function (err, ents) {
            if (err) return workflow.emit('exception', err);
            else {
                var ent = req.app.kenna.utility.convertEntitlement(ents, workflow.employee.leaveLevel);
                {
                    workflow.employee.leaveStatus.casual = {
                        entitlement: ent.casual,
                        taken: workflow.employee.leaveStatus.casual.taken || 0
                    }
                    workflow.employee.leaveStatus.annual = {
                        entitlement: ent.annual,
                        taken: workflow.employee.leaveStatus.annual.taken || 0
                    }
                    workflow.employee.leaveStatus.sick = {
                        entitlement: ent.sick,
                        taken: workflow.employee.leaveStatus.sick.taken || 0,
                        occassions: workflow.employee.leaveStatus.sick.occassions || 0
                    }
                    workflow.employee.leaveStatus.parenting = {
                        entitlement: workflow.employee.gender == 'Male' ? 3 : (workflow.employee.gender == 'Female' ? 90 : 0),
                        taken: workflow.employee.leaveStatus.parenting.taken || 0
                    }
                    ent.parenting = workflow.employee.leaveStatus.parenting.entitlement;
                    workflow.entitlement = ent;
                    var allowed = ent[workflow.leaveR.type.toLowerCase()] - workflow.employee.leaveStatus[workflow.leaveR.type.toLowerCase()].taken;
                    var isValid = allowed >= workflow.leaveR.days;
                    if (isValid) {
                        workflow.employee.leaveStatus[workflow.leaveR.type.toLowerCase()].taken += workflow.leaveR.days;
                        if (workflow.leaveR.type == 'Sick')++workflow.employee.leaveStatus.sick.occassions;
                        workflow.emit('verifyTimeRange');
                    }
                    else {
                        workflow.outcome.errors.push('Invalid number of days. ' + allowed + ' days available');
                        return workflow.emit('response');
                    }
                }
            }
        });
    });
    workflow.on('verifyTimeRange', function () {
        req.app.db.models.LeaveRequest.find({
            employee: workflow.employee.id,status: 'Approved',start: { $lt: workflow.leaveR.resumption },
            $or: [{
                resumption: { $gt: workflow.leaveR.start }
            }, {
                resumption: { $gt: workflow.leaveR.resumption }
            }]
        }).sort('start').exec(function (e, lrs) {
            if (e) {
                workflow.outcome.errors.push('Could not verify date availablity');
                return workflow.emit('response');
            }
            if (lrs.length > 0) {
                workflow.outcome.errors.push('The selected date range is unavailable. Employee already has a leave scheduled that overlaps the time period.');
                return workflow.emit('response');
            } else workflow.emit('getNextReference');
        });
    });
    workflow.on('getNextReference', function () {
        req.app.db.models.LeaveRequest.find(function (err, pd) {
            if (err) return workflow.emit('exception', err);
            else {
                if (pd && pd.length > 0) {
                    var lastRefNo = pd[pd.length - 1].referenceNumber;
                    workflow.leaveR.referenceNumber = 'Ref-L-' + req.app.kenna.utility.pad(parseInt(lastRefNo.split('-')[2]) + 1);
                }
                else workflow.leaveR.referenceNumber = 'Ref-L-' + req.app.kenna.utility.pad(1);
                workflow.emit('createRequest');
            }
        })
    });
    workflow.on('createRequest', function () {
        req.app.db.models.LeaveRequest.create(workflow.leaveR, function (err, leave) {
            if (!err) {
                workflow.leaveR = leave;
                return workflow.emit('updateEmployee');
            }
            console.log(err);
            workflow.outcome.errors.push('An error occurred while allocating leave record.');
            return workflow.emit('response');
        });
    });
    workflow.on('updateEmployee', function () {
        workflow.employee.save(function (err, emp) {
            if (err)
                workflow.leaveR.remove(function () {
                    workflow.outcome.errors.push('Could not complete the request. Error occurred while updating employee record.');
                    return workflow.emit('response');
                });
            else {
                workflow.employee.populate('supervisor', function(){
                    workflow.outcome.success = true;
                    workflow.outcome.message = 'Leave successful allocated';
                    workflow.emit('leaveRequestStatusChanged', workflow.leaveR, req.user, workflow.employee);
                    workflow.emit('response');
                });

            }
        });
    });
    workflow.emit('validate');
};

exports.makeLeaveRequest = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var leaveRequest = req.body;
        leaveRequest.status = 'Pre-Approval';
        leaveRequest.employee = req.user.employee.id;
        leaveRequest.requester = req.user.employee.fullName();
        ['start', 'resume', 'days', 'contact', 'type', 'requester', 'employee']
            .forEach(function (item) {
                if (!leaveRequest[item]) workflow.outcome.errfor[item] = 'required';
            });
        if (workflow.hasErrors()) {
            workflow.outcome.errors.push('Please ensure that all required fields are entered.');
            return workflow.emit('response');
        }
        else if (req.app.constants.leaveTypes.indexOf(leaveRequest.type) == -1) {
            workflow.outcome.errors.push('Invalid leave type.');
            return workflow.emit('response');
        } else {
            if (['Sick', 'Parenting'].indexOf(leaveRequest.type) == -1) {
                var date = new Date(new Date().toDateString());
                if (new Date(leaveRequest.start) < date) {
                    workflow.outcome.errors.push('Start date must be on or after today.');
                    return workflow.emit('response');
                }
            }
            leaveRequest.resumption = req.app.kenna.utility.nextDay(leaveRequest.start, leaveRequest.days, leaveRequest.type == 'Parenting').toDateString();
            workflow.leaveR = leaveRequest;
            workflow.emit('confirmEmployee');
        }
    });
    workflow.on('confirmEmployee', function () {
        req.app.db.models.Employee.findById(workflow.leaveR.employee, function (err, emp) {
            if (err) {
                workflow.outcome.errors.push('Could not verify employee record.');
                return workflow.emit('response');
            }
            else if (emp) {
                workflow.leaveR.requester = emp.fullName();
                workflow.employee = emp; workflow.leaveR.date = new Date();
                workflow.emit('verifySupervisor', emp);
            }
            else {
                workflow.outcome.errors.push('Selected employee was not found');
                return workflow.emit('response');
            }
        });
    });
    workflow.on('verifySupervisor', function () {
        req.app.db.models.Employee.findById(req.user.employee.supervisor, function (err, emp) {
            if (err) {
                workflow.outcome.errors.push('Could not verify approving officer.');
                return workflow.emit('response');
            }
            else if (emp) {//&& req.user.employee.access > emp.access
                workflow.leaveR.toApprove = emp.id;
                workflow.supervisor = emp;
                workflow.emit('verifyEntitlement');
            }
            else {
                workflow.outcome.errors.push('Approving officer was not found');
                return workflow.emit('response');
            }
        });
    });
    workflow.on('verifyEntitlement', function () {
        req.app.db.models.LeaveEntitlement.find({ level: workflow.employee.leaveLevel }, function (err, ents) {
            if (err) return workflow.emit('exception', err);
            else {
                var ent = req.app.kenna.utility.convertEntitlement(ents, workflow.employee.leaveLevel); {
                    workflow.employee.leaveStatus.casual = {
                        entitlement: ent.casual,
                        taken: workflow.employee.leaveStatus.casual.taken || 0
                    };
                    workflow.employee.leaveStatus.annual = {
                        entitlement: ent.annual,
                        taken: workflow.employee.leaveStatus.annual.taken || 0
                    };
                    workflow.employee.leaveStatus.sick = {
                        entitlement: ent.sick,
                        taken: workflow.employee.leaveStatus.sick.taken || 0,
                        occassions: workflow.employee.leaveStatus.sick.occassions || 0
                    };
                    workflow.employee.leaveStatus.parenting = {
                        entitlement: workflow.employee.gender == 'Male' ? 3 : (workflow.employee.gender == 'Female' ? 90 : 0),
                        taken: workflow.employee.leaveStatus.parenting.taken || 0
                    };
                    ent.parenting = workflow.employee.leaveStatus.parenting.entitlement;
                    workflow.entitlement = ent;
                    var allowed = ent[workflow.leaveR.type.toLowerCase()] - workflow.employee.leaveStatus[workflow.leaveR.type.toLowerCase()].taken;
                    var isValid = allowed >= workflow.leaveR.days;
                    if (isValid) {
                        workflow.employee.leaveStatus[workflow.leaveR.type.toLowerCase()].taken += workflow.leaveR.days;
                        if (workflow.leaveR.type == 'Sick')++workflow.employee.leaveStatus.sick.occassions;
                        workflow.emit('verifyTimeRange');
                    }
                    else {
                        workflow.outcome.errors.push('Invalid number of days. ' + allowed + ' days available');
                        return workflow.emit('response');
                    }
                }
            }
        });
    });
    workflow.on('verifyTimeRange', function () {
        req.app.db.models.LeaveRequest.find({
            employee: workflow.employee.id,status: 'Approved',start: { $lt: workflow.leaveR.resumption },
            $or: [{
                resumption: { $gt: workflow.leaveR.start }
            }, {
                resumption: { $gt: workflow.leaveR.resumption }
            }]
        }).sort('start').exec(function (e, lrs) {
            if (e) {
                workflow.outcome.errors.push('Could not verify date availablity');
                return workflow.emit('response');
            }
            if (lrs.length > 0) {
                workflow.outcome.errors.push('The selected date range is unavailable. You already have an approved leave that overlaps the time period.');
                return workflow.emit('response');
            } else workflow.emit('getNextReference');
        });
    });
    workflow.on('getNextReference', function () {
        req.app.db.models.LeaveRequest.find(function (err, pd) {
            if (err) return workflow.emit('exception', err);
            else {
                if (pd && pd.length > 0) {
                    var lastRefNo = pd[pd.length - 1].referenceNumber;
                    workflow.leaveR.referenceNumber = 'Ref-L-' + req.app.kenna.utility.pad(parseInt(lastRefNo.split('-')[2]) + 1);
                }
                else workflow.leaveR.referenceNumber = 'Ref-L-' + req.app.kenna.utility.pad(1);
                workflow.emit('createRequest');
            }
        })
    });
    workflow.on('createRequest', function () {
        req.app.db.models.LeaveRequest.create(workflow.leaveR, function (err, leave) {
            if (err) { return workflow.emit('exception', err); }
            else {
                workflow.outcome.success = true;
                workflow.outcome.message = 'Leave request successful';
                workflow.emit('leaveRequestStatusChanged', leave,req.user, workflow.supervisor);
                workflow.emit('response');
            }
        });
    });
    workflow.emit('validate');
}
exports.approveLeaveRequest2 = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('checkRequestStatus', function () {
        req.app.db.models.LeaveRequest
            .findById(req.body._id).populate('employee')
            .exec(function (err, pc) {
                if (err) {
                    workflow.outcome.errors.push('Could not retrieve leave request details. Try again later');
                    return workflow.emit('response');
                } else if (pc) {
                    var t; workflow.employee = pc.employee;
                    switch (pc.status) {
                        case 'Pre-Approval': case 'Disapproved': case 'Awaiting PD\'s Approval': break;
                        case 'Approved': t = 'Request already approved by ' + pc.approvedBy; break;
                        default: break;
                    }
                    if (t) {
                        workflow.outcome.errors.push(t);
                        return workflow.emit('response');
                    }
                    else if (pc.toApprove == req.user.employee.id) {
                        pc.approvedBy = req.user.employee.fullName(); workflow.leaveR = pc; workflow.emit('checkEntitlement');
                    } else {
                        workflow.outcome.errors.push('You cannot approve a request of' + pc.requester);
                        return workflow.emit('response');
                    }
                }
                else {
                    workflow.outcome.errors.push('Leave request was not found.');
                    return workflow.emit('response')
                }
            });
    });
    workflow.on('checkEntitlement', function () {
        req.app.db.models.LeaveEntitlement.find({ level: workflow.employee.leaveLevel }, function (err, ents) {
            if (err) return workflow.emit('exception', err);
            else {
                var ent = req.app.kenna.utility.convertEntitlement(ents, workflow.employee.leaveLevel);
                workflow.employee.leaveStatus.casual = {
                    entitlement: ent.casual,
                    taken: workflow.employee.leaveStatus.casual.taken || 0
                }
                workflow.employee.leaveStatus.annual = {
                    entitlement: ent.annual,
                    taken: workflow.employee.leaveStatus.annual.taken || 0
                }
                workflow.employee.leaveStatus.sick = {
                    entitlement: ent.sick,
                    taken: workflow.employee.leaveStatus.sick.taken || 0,
                    occassions: workflow.employee.leaveStatus.sick.occassions || 0
                }
                workflow.employee.leaveStatus.parenting = {
                    entitlement: workflow.employee.gender == 'Male' ? 3 : (workflow.employee.gender == 'Female' ? 90 : 0),
                    taken: workflow.employee.leaveStatus.parenting.taken || 0
                }
                ent.parenting = workflow.employee.leaveStatus.parenting.entitlement;
                workflow.entitlement = ent;
                var allowed = ent[workflow.leaveR.type.toLowerCase()] - workflow.employee.leaveStatus[workflow.leaveR.type.toLowerCase()].taken;
                var isValid = allowed >= workflow.leaveR.days;
                if (isValid) {
                    workflow.employee.leaveStatus[workflow.leaveR.type.toLowerCase()].taken += workflow.leaveR.days;
                    if (workflow.leaveR.type == 'Sick')++workflow.employee.leaveStatus.sick.occassions;
                    workflow.emit('verifyTimeRange');
                }
                else {
                    workflow.outcome.errors.push('Invalid number of days. ' + allowed + ' days available');
                    return workflow.emit('response');
                }
            }
        });
    });
    workflow.on('approve', function () {
        workflow.leaveR.status = 'Awaiting PD\'s Approval';
        workflow.leaveR.save(function (err, p) {
            if (err) {
                workflow.outcome.errors.push('An error occurred while approving the request. Try again later');
                return workflow.emit('response');
            }
            else {
                workflow.leaveR = p;
                return workflow.emit('updateEmployee');
            }
        });
    });
    workflow.on('verifyTimeRange', function () {
        req.app.db.models.LeaveRequest.find({
            employee: workflow.employee.id,status: 'Approved',start: { $lt: workflow.leaveR.resumption },
            $or: [{
                resumption: { $gt: workflow.leaveR.start }
            }, {
                resumption: { $gt: workflow.leaveR.resumption }
            }]
        }).sort('start').exec(function (e, lrs) {
            if (e) {
                workflow.outcome.errors.push('Could not verify date availablity');
                return workflow.emit('response');
            }
            if (lrs.length > 0) {
                workflow.outcome.errors.push('The selected date range is unavailable. Employee already has a leave scheduled that overlaps the time period.');
                return workflow.emit('response');
            } else workflow.emit('approve');
        });
    });
    workflow.on('updateEmployee', function () {
        workflow.employee.save(function (err, emp) {
            if (err)
                workflow.leaveR.remove(function () {
                    workflow.outcome.errors.push('Could not complete the request. Error occurred while updating leave record.');
                    return workflow.emit('response');
                });
            else {
                workflow.outcome.success = true;
                workflow.outcome.message = 'Leave Request was successfully pre-approved';
                workflow.emit('leaveRequestStatusChanged', workflow.leaveR, req.user);
                workflow.emit('response');
            }
        });
    });
    workflow.emit('checkRequestStatus');
};
exports.declineLeaveRequest = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('checkrequestStatus', function () {
        req.app.db.models.LeaveRequest
            .findById(req.body._id)
            .populate('employee')
            .exec(function (err, pc) {
                if (err) {
                    workflow.outcome.errors.push('Could not retrieve leave request details. Try again later');
                    return workflow.emit('response');
                } else if (pc) {
                    var t;
                    switch (pc.status) {
                        case 'Pre-Approval': break;
                        case 'Disapproved': t = 'Request already disapproved by ' + pc.approvedBy; break;
                        case 'Approved': t = 'Request already approved by ' + pc.approvedBy; break;
                        default: break;
                    }
                    if (t) {
                        workflow.outcome.errors.push(t);
                        return workflow.emit('response');
                    }
                    else if (pc.toApprove == req.user.employee.id) {
                        workflow.leaveR = pc; workflow.emit('decline');
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
    workflow.on('decline', function () {
        workflow.leaveR.status = 'Disapproved';
        workflow.leaveR.save(function (err, s) {
            if (err) {
                workflow.outcome.errors.push('An error occurred while disapproving the request. Try again later');
                return workflow.emit('response');
            }
            else {
                workflow.outcome.success = true;
                workflow.outcome.message = 'Leave Request has been declined';
                workflow.emit('leaveRequestStatusChanged', s, req.user);
                workflow.emit('response');
            }
        });
    });
    workflow.emit('checkrequestStatus');
};

//workflow.emit('leaveRequestStatusChanged', workflow.leaveR, req.user);
exports.getLeaveRequestsAsPD = function(){
    req.app.db.models.LeaveRequest
        .find({ $or: [{ status: "Awaiting PD's Approval" }, { status: '"Pre-Approval"' }] }, function (err, pc) {
            if (err) res.json([]);
            else {
                res.json(require('underscore').groupBy(pc, 'status'));
            }
        });
};
exports.approveLeaveRequest = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('checkRequestStaus', function () {
        req.app.db.models.LeaveRequest
            .findById(req.body._id).populate('employee')
            .exec(function (err, pc) {
                if (err) {
                    workflow.outcome.errors.push('Could not retrieve leave request details. Try again later');
                    return workflow.emit('response');
                } else if (pc) {
                    var t; workflow.employee = pc.employee;
                    switch (pc.status) {
                        case 'Pre-Approval': case 'Disapproved': break;
                        case 'Awaiting PD\'s Approval': t = 'Request is awaiting PD\'s approval.'; break;
                        case 'Approved': t = 'Request already approved by ' + pc.approvedBy; break;
                        default: break;
                    }
                    if (t) {
                        workflow.outcome.errors.push(t);
                        return workflow.emit('response');
                    }
                    else if (pc.toApprove == req.user.employee.id) {
                        pc.approvedBy = req.user.employee.fullName(); workflow.leaveR = pc; workflow.emit('checkEntitlement');
                    } else {
                        workflow.outcome.errors.push('You cannot approve a request of' + pc.requester);
                        return workflow.emit('response');
                    }
                }
                else {
                    workflow.outcome.errors.push('Leave request was not found.');
                    return workflow.emit('response')
                }
            });
    });
    workflow.on('checkEntitlement', function () {
        req.app.db.models.LeaveEntitlement.find({ level: workflow.employee.leaveLevel }, function (err, ents) {
            if (err) return workflow.emit('exception', err);
            else {
                var ent = req.app.kenna.utility.convertEntitlement(ents, workflow.employee.leaveLevel);
                workflow.employee.leaveStatus.casual = {
                    entitlement: ent.casual,
                    taken: workflow.employee.leaveStatus.casual.taken || 0
                }
                workflow.employee.leaveStatus.annual = {
                    entitlement: ent.annual,
                    taken: workflow.employee.leaveStatus.annual.taken || 0
                }
                workflow.employee.leaveStatus.sick = {
                    entitlement: ent.sick,
                    taken: workflow.employee.leaveStatus.sick.taken || 0,
                    occassions: workflow.employee.leaveStatus.sick.occassions || 0
                }
                workflow.employee.leaveStatus.parenting = {
                    entitlement: workflow.employee.gender == 'Male' ? 3 : (workflow.employee.gender == 'Female' ? 90 : 0),
                    taken: workflow.employee.leaveStatus.parenting.taken || 0
                }
                ent.parenting = workflow.employee.leaveStatus.parenting.entitlement;
                workflow.entitlement = ent;
                var allowed = ent[workflow.leaveR.type.toLowerCase()] - workflow.employee.leaveStatus[workflow.leaveR.type.toLowerCase()].taken;
                var isValid = allowed >= workflow.leaveR.days;
                if (isValid) {
                    workflow.employee.leaveStatus[workflow.leaveR.type.toLowerCase()].taken += workflow.leaveR.days;
                    if (workflow.leaveR.type == 'Sick')++workflow.employee.leaveStatus.sick.occassions;
                    workflow.emit('verifyTimeRange');
                }
                else {
                    workflow.outcome.errors.push('Invalid number of days. ' + allowed + ' days available');
                    return workflow.emit('response');
                }
            }
        });
    });
    workflow.on('approve', function () {
        workflow.leaveR.status = 'Awaiting PD\'s Approval';
        workflow.leaveR.save(function (err, p) {
            if (err) {
                workflow.outcome.errors.push('An error occurred while approving the request. Try again later');
                return workflow.emit('response');
            }
            else {
                workflow.leaveR = p;
                //return workflow.emit('updateEmployee');
                workflow.outcome.success = true;
                workflow.outcome.message = 'Leave Request was successfully pre-approved';
                workflow.emit('leaveRequestStatusChanged', workflow.leaveR, req.user);
                return workflow.emit('response');
            }
        });
    });
    workflow.on('verifyTimeRange', function () {
        req.app.db.models.LeaveRequest.find({
            employee: workflow.employee.id,status: 'Approved',start: { $lt: workflow.leaveR.resumption },
            $or: [{
                resumption: { $gt: workflow.leaveR.start }
            }, {
                resumption: { $gt: workflow.leaveR.resumption }
            }]
        }).sort('start').exec(function (e, lrs) {
            if (e) {
                workflow.outcome.errors.push('Could not verify date availablity');
                return workflow.emit('response');
            }
            if (lrs.length > 0) {
                workflow.outcome.errors.push('The selected date range is unavailable. Employee already has a leave scheduled that overlaps the time period.');
                return workflow.emit('response');
            } else workflow.emit('approve');
        });
    });
    workflow.on('updateEmployee', function () {
        workflow.employee.save(function (err, emp) {
            if (err)
                workflow.leaveR.remove(function () {
                    workflow.outcome.errors.push('Could not complete the request. Error occurred while updating leave record.');
                    return workflow.emit('response');
                });
            else {
                workflow.outcome.success = true;
                workflow.outcome.message = 'Leave Request was successfully pre-approved';
                workflow.emit('leaveRequestStatusChanged', workflow.leaveR, req.user);
                workflow.emit('response');
            }
        });
    });
    workflow.emit('checkRequestStaus');
};
exports.approveLeaveRequestAsPD = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var leaveRequest = req.body;
        ['start', 'resume', 'days', 'contact', 'type', '_id']
            .forEach(function (item) {
                if (!leaveRequest[item])
                    workflow.outcome.errfor[item] = 'required';
            });
        if (workflow.hasErrors()) {
            workflow.outcome.errors.push('Please ensure that all required fields are entered.');
            return workflow.emit('response');
        }
        else if (['Annual', 'Casual', 'Sick', 'Parenting'].indexOf(leaveRequest.type) == -1) {
            workflow.outcome.errors.push('Invalid leave type.');
            return workflow.emit('response');
        }
        else {
            leaveRequest.resumption = req.app.kenna.utility.nextDay(leaveRequest.start, leaveRequest.days, leaveRequest.type == 'Parenting').toDateString();
            workflow.updatedLeave = leaveRequest;
            workflow.emit('getOriginalRecord');
        }
    });
    workflow.on('getOriginalRecord', function(){
        req.app.db.models.LeaveRequest.findById(workflow.updatedLeave._id)
            .populate('employee')
            .exec(function(e, leave) {
                if (e) {
                    workflow.outcome.errors.push('Could not retrieve original leave request.');
                    return workflow.emit('response');
                }
                if (!leave) {
                    workflow.outcome.errors.push('Original leave request was not found');
                    return workflow.emit('response');
                }
                var update = workflow.updatedLeave;
                if (leave.referenceNumber != update.referenceNumber) {
                    workflow.outcome.errors.push('The submitted request doesnot match the original');
                    return workflow.emit('response');
                }
                var t = '';
                switch (leave.status) {
                    case 'Pre-Approval':
                    case 'Disapproved':
                    case 'Awaiting PD\'s Approval':
                        break;
                    case 'Approved':
                        t = 'Request has already been approved.';
                        break;
                    default:
                        break;
                }
                if (t) {
                    workflow.outcome.errors.push(t);
                    return workflow.emit('response');
                }
                if (leave.type == update.type && new Date(leave.start).getTime() == new Date(update.start).getTime() && leave.days == update.days) {
                    if (update.contact != leave.contact) {
                        leave.contact = update.contact;
                        leave.save(function () {
                            workflow.emit('verifyEntitlement', leave, leave.employee);
                        });
                    } else workflow.emit('verifyEntitlement', leave, leave.employee);
                } else {
                    leave.employee.leaveStatus[leave.type.toLowerCase()].taken -= leave.days;
                    leave.contact = update.contact || leave.contact;
                    leave.start = update.start;
                    leave.days = update.days;
                    leave.resumption = update.resumption;

                    workflow.emit('verifyEntitlement', leave, leave.employee);
                }
            });
    });
    workflow.on('verifyEntitlement', function (leave, employee) {
        req.app.db.models.LeaveEntitlement.find({ level: employee.leaveLevel }, function (err, ents) {
            if (err) return workflow.emit('exception', err);
            else {
                var ent = req.app.kenna.utility.convertEntitlement(ents, employee.leaveLevel);
                employee.leaveStatus.casual = {
                    entitlement: ent.casual,
                    taken: employee.leaveStatus.casual.taken || 0
                }
                employee.leaveStatus.annual = {
                    entitlement: ent.annual,
                    taken: employee.leaveStatus.annual.taken || 0
                }
                employee.leaveStatus.sick = {
                    entitlement: ent.sick,
                    taken: employee.leaveStatus.sick.taken || 0,
                    occassions: employee.leaveStatus.sick.occassions || 0
                }
                employee.leaveStatus.parenting = {
                    entitlement: employee.gender == 'Male' ? 3 : (employee.gender == 'Female' ? 90 : 0),
                    taken: employee.leaveStatus.parenting.taken || 0
                }
                ent.parenting = employee.leaveStatus.parenting.entitlement;
                workflow.entitlement = ent;
                var allowed = ent[leave.type.toLowerCase()] - employee.leaveStatus[leave.type.toLowerCase()].taken;
                var isValid = allowed >= leave.days;
                if (isValid) {
                    employee.leaveStatus[leave.type.toLowerCase()].taken += leave.days;
                    if (leave.type == 'Sick') ++employee.leaveStatus.sick.occassions;
                    workflow.employee = employee; workflow.leave = leave;
                    workflow.emit('verifyTimeRangeAndSave');
                }
                else {
                    workflow.outcome.errors.push('Invalid number of days. ' + allowed + ' days available');
                    return workflow.emit('response');
                }
            }
        });
    });
    workflow.on('verifyTimeRangeAndSave', function () {
        req.app.db.models.LeaveRequest.find({
            employee: workflow.employee.id,status: 'Approved',start: { $lt: workflow.leave.resumption }, _id: {$ne: workflow.leave.id},
            $or: [{
                resumption: { $gt: workflow.leave.start }
            }, {
                resumption: { $gt: workflow.leave.resumption }
            }]
        }).sort('start').exec(function (e, lrs) {
            if (e) {
                workflow.outcome.errors.push('Could not verify date availablity');
                return workflow.emit('response');
            }
            if (lrs.length > 0) {
                console.log(lrs.map(function(i){return i.id;}));
                workflow.outcome.errors.push('The selected date range is unavailable. Employee already has a leave scheduled that overlaps the time period.');
                return workflow.emit('response');
            } else {
                workflow.leave.status = 'Approved';
                workflow.leave.save(function(){
                    workflow.employee.save(function () {
                        workflow.outcome.success = true;
                        workflow.outcome.message = 'Leave request successful approved.';
                        workflow.emit('response');
                    });
                });
            }
        });
    });
    workflow.emit('validate');
};
exports.declineLeaveRequestAsPD = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('checkrequestStatus', function () {
        req.app.db.models.LeaveRequest
            .findById(req.body._id)
            .exec(function (err, pc) {
                if (err) {
                    workflow.outcome.errors.push('Could not retrieve leave request details. Try again later');
                    return workflow.emit('response');
                } else if (pc) {
                    var t;
                    switch (pc.status) {
                        case 'Pre-Approval': case 'Awaiting PD\'s Approval': case 'Disapproved': break;
                        case 'Approved':  t = 'Leave request has already been approved.'; break;
                        default: break;
                    }
                    if (t) {
                        workflow.outcome.errors.push(t);
                        return workflow.emit('response');
                    }
                    else {
                        pc.status = 'Disapproved';
                        workflow.leave = pc; workflow.emit('decline');
                    }
                }
                else {
                    workflow.outcome.errors.push('Request was not found.');
                    return workflow.emit('response')
                }
            });
    });
    workflow.on('decline', function () {
        workflow.leave.save(function (err, pc) {
            if (err) {
                workflow.outcome.errors.push('An error occurred while approving the request. Try again later');
                return workflow.emit('response');
            }
            else {
                workflow.outcome.success = true;
                workflow.outcome.message = 'Leave Request has been declined';
                workflow.emit('leaveRequestStatusChanged', pc);
                workflow.emit('response');
            }
        });
    });
    workflow.emit('checkrequestStatus');
};
exports.updateLeaveRequest = function(req, res){
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var leaveRequest = req.body;
        ['start', 'resume', 'days', 'contact', 'type', '_id']
            .forEach(function (item) {
                if (!leaveRequest[item])
                    workflow.outcome.errfor[item] = 'required';
            });
        if (workflow.hasErrors()) {
            workflow.outcome.errors.push('Please ensure that all required fields are entered.');
            return workflow.emit('response');
        }
        else if (['Annual', 'Casual', 'Sick', 'Parenting'].indexOf(leaveRequest.type) == -1) {
            workflow.outcome.errors.push('Invalid leave type.');
            return workflow.emit('response');
        }
        else {
            leaveRequest.resumption = req.app.kenna.utility.nextDay(leaveRequest.start, leaveRequest.days, leaveRequest.type == 'Parenting').toDateString();
            workflow.updatedLeave = leaveRequest;
            workflow.emit('getOriginalRecord');
        }
    });
    workflow.on('getOriginalRecord', function(){
       req.app.db.models.LeaveRequest.findById(workflow.updatedLeave._id)
           .populate('employee')
           .exec(function(e, leave){
               if(e){
                   workflow.outcome.errors.push('Could not retrieve original leave request.');
                   return workflow.emit('response');
               }
               if(!leave){
                   workflow.outcome.errors.push('Original leave request was not found');
                   return workflow.emit('response');
               }
               var update = workflow.updatedLeave;
               if(leave.referenceNumber != update.referenceNumber){
                   workflow.outcome.errors.push('The submitted request doesnot match the original');
                   return workflow.emit('response');
               }
               //var t;
               //switch (leave.status) {
               //    case 'Pre-Approval': case 'Awaiting PD\'s Approval': case 'Disapproved': break;
               //    case 'Approved':  t = 'Leave request has already been approved.'; break;
               //    default: break;
               //}
               if (t) {
                   workflow.outcome.errors.push(t);
                   return workflow.emit('response');
               }
               if(leave.type == update.type && new Date(leave.start).getTime() == new Date(update.start).getTime() && leave.days == update.days){
                   if(update.contact != leave.contact){
                       leave.contact = update.contact;
                       leave.save(function(){
                           workflow.outcome.message  = 'Successfully updated the contact information.';
                           workflow.outcome.success = true;
                           return workflow.emit('response');
                       });
                   }else {
                       workflow.outcome.errors.push('Submitted request is the same as original.');
                       return workflow.emit('response');
                   }
               }else {
                   var changes = {
                       'new': {
                           type: update.type, days : update.days, start: update.start, contact: update.contact
                       },'old': {
                           type: leave.type, days : leave.days, start: leave.start, contact: leave.contact
                       }
                   };
                   leave.employee.leaveStatus[leave.type.toLowerCase()].taken -= leave.days;
                   leave.contact = update.contact || leave.contact;
                   leave.start = update.start;
                   leave.days = update.days;
                   leave.resumption = update.resumption;

                   workflow.emit('verifyEntitlement', leave, leave.employee);
               }
           })
    });
    workflow.on('verifyEntitlement', function (leave, employee) {
        req.app.db.models.LeaveEntitlement.find({ level: employee.leaveLevel }, function (err, ents) {
            if (err) return workflow.emit('exception', err);
            else {
                var ent = req.app.kenna.utility.convertEntitlement(ents, employee.leaveLevel);
                    employee.leaveStatus.casual = {
                        entitlement: ent.casual,
                        taken: employee.leaveStatus.casual.taken || 0
                    }
                    employee.leaveStatus.annual = {
                        entitlement: ent.annual,
                        taken: employee.leaveStatus.annual.taken || 0
                    }
                    employee.leaveStatus.sick = {
                        entitlement: ent.sick,
                        taken: employee.leaveStatus.sick.taken || 0,
                        occassions: employee.leaveStatus.sick.occassions || 0
                    }
                    employee.leaveStatus.parenting = {
                        entitlement: employee.gender == 'Male' ? 3 : (employee.gender == 'Female' ? 90 : 0),
                        taken: employee.leaveStatus.parenting.taken || 0
                    }
                    ent.parenting = employee.leaveStatus.parenting.entitlement;
                    workflow.entitlement = ent;
                    var allowed = ent[leave.type.toLowerCase()] - employee.leaveStatus[leave.type.toLowerCase()].taken;
                    var isValid = allowed >= leave.days;
                    if (isValid) {
                        employee.leaveStatus[leave.type.toLowerCase()].taken += leave.days;
                        if (leave.type == 'Sick') ++employee.leaveStatus.sick.occassions;
                        workflow.employee = employee; workflow.leave = leave;
                        workflow.emit('verifyTimeRangeAndSave');
                    }
                    else {
                        workflow.outcome.errors.push('Invalid number of days. ' + allowed + ' days available');
                        return workflow.emit('response');
                    }
            }
        });
    });
    workflow.on('verifyTimeRangeAndSave', function () {
        req.app.db.models.LeaveRequest.find({
            employee: workflow.employee.id,status: 'Approved',start: { $lt: workflow.leave.resumption }, _id: {$ne: workflow.leave.id},
            $or: [{
                resumption: { $gt: workflow.leave.start }
            }, {
                resumption: { $gt: workflow.leave.resumption }
            }]
        }).sort('start').exec(function (e, lrs) {
            if (e) {
                workflow.outcome.errors.push('Could not verify date availablity');
                return workflow.emit('response');
            }
            if (lrs.length > 0) {
                console.log(lrs.map(function(i){return i.id;}));
                workflow.outcome.errors.push('The selected date range is unavailable. Employee already has a leave scheduled that overlaps the time period.');
                return workflow.emit('response');
            } else {
                workflow.leave.save(function(e){
                   console.log('Saving Updated Leave', e);
                    workflow.employee.save(function () {
                        workflow.outcome.success = true;
                        workflow.outcome.message = 'Leave request successful updated.';
                        workflow.emit('response');
                    });
                });
            }
        });
    });
    workflow.emit('validate');
};

//To be implemented : Notification for leave status change.