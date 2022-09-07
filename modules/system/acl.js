module.exports = function (app) {
    app.ensureAuthenticated = function (req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        res.set('X-Auth-Required', 'true');
        req.session.returnUrl = req.originalUrl;
        res.redirect('/');
    };

    //#region By Department
    app.ensureIT = function (req, res, next) {
        if (req.user && req.user.employee && req.user.employee.department.id == req.app.IT.id) return next();
        res.status(403).end('Only accessible to IT');
    };
    app.ensureFinance = function (req, res, next) {
        if (req.user && req.user.employee && req.user.employee.department.id == req.app.Finance.id) return next();
        res.status(403).end('Only accessible to finance');
    };
    app.ensureCounsel = function (req, res, next) {
        if (req.user.employee.department.id == req.app.counsel.id) next(); else res.status(403).end('Only accessible to counsel');
    };
    app.ensureAccount = function (req, res, next) {
        if (req.user.canPlayRoleOf('account')) {
            if (req.app.config.requireAccountVerification) {
                if (req.user.roles.account.isVerified !== 'yes' && !/^\/account\/verification\//.test(req.url)) {
                    return res.redirect('/account/verification/');
                }
            }
            return next();
        }
        res.redirect('/');
    };
    //#endregion

    //#region By Delegation
    app.ensureRequest = function (req, res, next, task) {
        if (req.user && req.user.employee && (req.user.employee.access == 'M' || req.user.employee.access == 'O' || req.user.employee.tasks.indexOf('cas') > -1 || req.user.employee.tasks.indexOf('lev') > -1)) return next();
        res.status(403).end('Unauthorized');
    };
    var ensureDelegated = function (req, res, next, task) {
        if (req.user && req.user.employee && (req.user.employee.access == 'M' || req.user.employee.access == 'O' || req.user.employee.tasks.indexOf(task) > -1)) return next();
        res.status(403).end('Unauthorized');
    };
    app.ensureAttendance = function (req, res, next) {
        ensureDelegated(req, res, next, 'att');
    };
    app.ensureCashApproval = function (req, res, next) {
        ensureDelegated(req, res, next, 'cas');
    };
    app.ensureEmpRecord = function (req, res, next) {
        ensureDelegated(req, res, next, 'emp');
    };
    app.ensureFacility = function (req, res, next) {
        ensureDelegated(req, res, next, 'fac');
    };
    app.ensureLeave = function (req, res, next) {
        ensureDelegated(req, res, next, 'lev');
    };
    app.ensureQuote = function (req, res, next) {
        ensureDelegated(req, res, next, 'quo');
    };
    app.ensureTraining = function (req, res, next) {
        ensureDelegated(req, res, next, 'trn');
    };
    //#endregion

    //#region By Role
    app.ensureAdmin = function (req, res, next) {
        if (req.user && req.user.employee && (req.user.employee.access == 'M' || req.user.employee.access == 'O')) return next();
        res.status(403).send('Access forbidden.');
    };
    app.ensurePD = function (req, res, next) {
        if (req.user && req.app.pd && req.user.employee && req.user.employee.id == req.app.pd.id) return next();
        res.status(403).send('Access forbidden.');
    };
    app.ensureSupervisor = function (req, res, next) {
        if (req.user && req.user.employee.isASupervisor()) {
            return next();
        }
        res.status(403).send('Employee is not a supervisor.');
    };

    //#region By Ownership
    var ensureOwnRecord = function (req, res, next, model, prop, prop2) {
        if (req.user && req.user.employee) {
            req.app.db.models[model].findById(req.params.id)
                .exec(function (e, r) {
                    if (e) return res.status(500).end('Could not verify access to record');
                    else if (r && r[prop] == req.user.employee[prop2]) {
                        req[prop] = r;
                        next();
                    } else res.status(r ? 403 : 404).end(r ? 'Record belongs to another employee' : 'Required record was not found.');
                });
        } else return res.status(403).end('Unauthorized');
    };
    app.ensureAttendanceOwn = function (req, res, next) {
        ensureOwnRecord(req, res, next, 'Attendance', 'employeeId', 'employeeId');
    };
    app.ensureRequestOwn = function (req, res, next) {
        ensureOwnRecord(req, res, next, 'CashRequest', 'id', 'id');
    };

    //#region Case
    app.ensureTeamLeader = function (req, res, next) {
        if (req.user.employee.department.id == req.app.counsel.id) {
            if ((req.app.seniorCounsels || []).indexOf(req.user.employee.designation) != -1) next();
            else res.status(403).end('Only accessible to senior counsels');
        } else res.status(403).end('Only accessible to counsel');
    };


};