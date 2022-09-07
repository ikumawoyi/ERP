//#region Disciplinary Actions
exports.getDisciplinaryActions = function (req, res) {
    req.app.db.models.DisciplinaryAction.find()
            .populate('employee', 'firstName lastName department designation employeeId')
            .populate('copied', 'firstName lastName department designation')
            .populate('issuedBy', 'firstName lastName department designation')
            .exec(function (er, discs) {
                req.app.db.models.Organisation.populate(discs, { path: 'employee.department issuedBy.department copied.department', select: 'name' }, function () {
                    res.json(discs || []);
                });
            });
};
exports.getSubDisciplinaryActions = function (req, res) {
    req.app.db.models.DisciplinaryAction.find({ employee: { $in: req.user.employee.subordinates } })
            .populate('employee', 'firstName lastName department designation')
            .populate('copied', 'firstName lastName department')
            .exec(function (er, discs) {
                req.app.db.models.Organisation.populate(discs, { path: 'employee.department', select: 'name' }, function () {
                    res.json(discs || []);
                });
            });
};
exports.getMyDisciplinaryActions = function (req, res) {
    req.app.db.models.DisciplinaryAction.find({ employee: req.user.employee.id }, '-copied')
            .populate('employee', 'firstName lastName department')
            .populate('issuedBy', 'firstName lastName department designation')
            .exec(function (er, discs) { res.json(discs || []); });
};
exports.sendQuery = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var query = req.body;
        if (!(query.employee || {})._id) {
            workflow.outcome.errors.push('No Employee was selected, please an employee to query.');
            return workflow.emit('response');
        } else if (query.employee._id == req.user.employee.id) {
            workflow.outcome.errors.push('You cannot send a query to yourself.');
            return workflow.emit('response');
        } else if (!query.copied || !query.copied.length) {
            workflow.outcome.errors.push('No Employee(s) selected to be copied.');
            return workflow.emit('response');
        } else {
            var msg = [];
            ['subject', 'reply', 'description']
                    .forEach(function (i) { if (!query[i]) msg.push(req.app.kenna.utility.capitalize(i)); });
            if (msg.length > 0) {
                workflow.outcome.errors.push(msg.join(',') + ' field' + (msg.length > 1 ? 's are' : ' is') + ' required.');
                return workflow.emit('response');
            } else workflow.emit('checkEmployeeAndQuery', query);
        }
    });
    workflow.on('checkEmployeeAndQuery', function (data) {
        req.app.db.models.Employee.findById(data.employee._id,
                'firstName lastName department designation', function (er, emp) {
                    if (!emp) {
                        workflow.outcome.errors.push(er ? 'An error occurred while retrieving selected employee.' : 'The selected employee was not found.');
                        return workflow.emit('response');
                    } else {
                        data.employee = data.employee._id; data.issuedBy = req.user.employee.id;
                        delete data._id; data.status = 'Initiated'; data.issued = new Date(new Date().toDateString());
                        req.app.db.models.DisciplinaryAction.create(data, function (er, app) {
                            if (er) {
                                workflow.outcome.errors.push('An error occurred while sending selected employee query, please try again.');
                                return workflow.emit('response');
                            } else {
                                var cbx = function (e) {
                                    if (e) res.json({ success: false, message: 'Query could not be sent for ' + emp.fullName() + '.' });
                                    else res.json({ success: true, message: 'Query has been sent for ' + emp.fullName() + '.' });
                                };
                                req.app.utility.notify.emit('queryInitiated', app, req.user, cbx);
                            }
                        });
                    }
                });
    });
    workflow.emit('validate');
};
exports.replyQuery = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var query = req.body;
        if (!(query || {})._id) {
            workflow.outcome.errors.push('Could not identified the submitted query.');
            return workflow.emit('response');
        } else if (!query.replyText) {
            workflow.outcome.errors.push('The "Reply Text" field is required. Please enter a reply and try again');
            return workflow.emit('response');
        } else workflow.emit('getQuery', query);
    });
    workflow.on('getQuery', function (query) {
        req.app.db.models.DisciplinaryAction.findById(query._id, function (e, q) {
            if (e || !q) {
                workflow.outcome.errors.push(e ? 'An error occurred while retrieving the query' : 'The submitted query was not found.');
                return workflow.emit('response');
            } else if (q.employee != req.user.employee.id) {
                workflow.outcome.errors.push('You cannot respond to a query belonging to another employee.');
                return workflow.emit('response');
            } else {
                q.replyText = query.replyText; q.status = 'Responded';
                q.replyDate = new Date(new Date().toDateString());
                q.save(function () {
                    workflow.outcome.success = true;
                    workflow.outcome.message = 'Successfully sent your reply';
                    req.app.utility.notify.emit('repliedQuery', q);
                    return workflow.emit('response');
                });
            }
        });
    });
    workflow.emit('validate');
};
//#endregion