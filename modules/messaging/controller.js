
exports.getAllMessages = function (req, res) {
    var query = '';
    function getDept() {
        req.app.db.models.Employee
            .findById(req.user.employee.id)
            .populate('department')
            .exec(function (err, emp) {
                if (err) res.json([]);
                else if (emp) {
                    if (emp.canPlayRoleOf('Finance'))
                        query = {
                            $or: [{ recipientId: req.user.employee.id }, { recipient: 'Finance' }, {
                                many: {
                                    department: req.user.employee.department.name, designations: req.user.employee.designation
                                }
                            }]
                        };
                    else if (emp.canPlayRoleOf('Admin'))
                        query = {
                            $or: [{ recipientId: req.user.employee.id }, { recipient: 'PD' }, {
                                group: {
                                    department: req.user.employee.department.name, designations: req.user.employee.designation
                                }
                            }]
                        };
                    else
                        query = {
                            $or: [{ recipientId: req.user.employee.id }, {
                                group: {
                                    department: req.user.employee.department.name, designations: req.user.employee.designation
                                }
                            }]
                        };
                    getMessages();
                } else res.json([]);
            });
    }

    function getMessages() {
        req.app.db.models.MailMessage.find(query, function (er, mm) {
            if (er) res.json([]);
            else res.json(mm);
        });
    }
    getDept();
};
exports.getMessages = function (req, res) {
    var query = {};//{ date: { $gte: start, $lte: end } }
    function getDept() {
        var start = new Date(new Date().toDateString());
        var end = new Date(start); end.setHours(24);
        req.app.db.models.Employee
            .findById(req.user.employee.id)
            .populate('department')
            .exec(function (err, emp) {
                if (err) res.json([]);
                else if (emp) {
                    if (emp.canPlayRoleOf('Finance'))
                        query = {
                            $and: [{ date: { $gte: start, $lte: end } }, {
                                $or: [{ recipientId: req.user.employee.id }, { recipient: 'Finance' },
                                    { group: { department: req.user.employee.department.name, designations: req.user.employee.designation } }]
                            }]
                        };
                    else if (emp.canPlayRoleOf('Admin'))
                        query = {
                            $and: [{ date: { $gte: start, $lte: end } }, {
                                $or: [{ recipientId: req.user.employee.id }, { recipient: 'PD' },
                                    { group: { department: req.user.employee.department.name, designations: req.user.employee.designation } }]
                            }]
                        };
                    else
                        query = {
                            $and: [{ date: { $gte: start, $lte: end } }, {
                                $or: [{ recipientId: req.user.employee.id },
                                    { group: { department: req.user.employee.department.name, designations: req.user.employee.designation } }]
                            }]
                        };
                    getMessages();
                } else res.json([]);
            });
    }

    function getMessages() {
        req.app.db.models.MailMessage.find(query, function (er, mm) {
            if (er) res.json([]);
            else res.json(mm);
        });
    }
    return res.json([]);
    getDept();
};
