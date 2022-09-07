
exports.saveNewDelegation = function (req, res) {
    var delegation = req.body;
    req.app.db.models.Employee.findById((delegation.employee)._id, function (e, d) {
        if (e || !d) res.status(e ? 500 : 400).send(e ? 'An error occurred while retrieving employee' : 'Employee was not found');
        else {
            req.app.db.models.Delegation.findOne({ employee: d.id }, function (e, dd) {
                if (!dd) dd = new req.app.db.models.Delegation({ employee: d.id })
                dd.tasks = delegation.tasks; dd.status = 'Active';
                dd.modified = new Date();
                dd.save(function (e) {
                    if (e) res.json({ success: false, message: 'Could not complete the task delegation.' });
                    else dd.populate('employee', function(){
                        dd.employee.tasks = dd.tasks;
                        dd.employee.save(function (er) {
                            if(er) return res.json({success: false, message: 'Could not modify employee record.', err: er});
                            res.json({ success: true, message: 'Successfully completed task delegation for ' + d.fullName() });
                        })
                    });
                });
            });
        }
    });
};
exports.updateDelegation = function (req, res) {
    var dd = req.body;
    req.app.db.models.Delegation.findById(dd._id, function (e, d) {
        if (e || !d) res.status(e ? 500 : 400).send(e ? 'An error occurred while retrieving delegation' : 'Delegation record was not found');
        else {
            if (dd.employee._id != d.employee) return res.json({ success: false, message: 'The task delegation record belongs to someone else.' });
            d.status = dd.status;
            d.modified = new Date();
            d.tasks = dd.tasks;
            d.save(function (e) {
                if (e) res.json({ success: false, message: 'Could not complete the task delegation' });
                else {
                    d.populate('employee', function () {
                        if (dd.status == 'Active') d.employee.tasks = dd.tasks;
                        else d.employee.tasks = [];
                        d.employee.save(function (er) {
                            if(er) return res.json({success: false, message: 'Could not modify employee record.', err: er});
                            res.json({ success: true, message: 'Successfully completed task delegation update for ' + d.employee.fullName() });
                        })
                    });
                }
            });
        }
    });
};
exports.getDelegations = function (req, res) {
    var map = {
        'Attendance Management': 'att',
        'Facility Management': 'fac',
        'Leave Management': 'lev',
        'Cash Approval': 'cas',
        'Employee Record': 'emp',
        'Quote Management': 'quo',
        'Training Management': 'trn'
    }
    var map2 = {}; for (var m in map) { map2[map[m]] = m; }
    var tsk = {
        'fac': false, 'att': false, 'emp': false, 'lev': false, 'cas': false, 'quo': false, 'trm': false
    }

    req.app.db.models.Delegation.distinct('employee')
        .exec(function (e, u) {
            var async = require('async');
            async.parallel([function (cb) {
                req.app.db.models.Delegation.find({})
                    .populate('employee', 'firstName lastName designation')
                    .exec(function (e, t) { cb(e, t); });
            }, function (cb) {
                req.app.db.models.Employee.find({ _id: { $nin: u || [] }, status: {$ne: 'Inactive'} }, 'firstName lastName designation department tasks')
                    .populate('department', 'name')
                    .exec(function (e, t) { cb(e, t); });
            }], function (er, results) {
                if (er) res.status(500).send(er); else res.json({
                    delegations: results[0], emps: results[1], delTasks: map
                });
            });
        });
}