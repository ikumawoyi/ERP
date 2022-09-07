'use strict';
Date.prototype.nextDay = function (d, allDays) {
    var end = new Date(this);
    var count = 0;
    while (count < d) {
        end.setDate(end.getDate() + 1);
        if (!allDays && (end.getDay() == 6 || end.getDay() == 0)) continue;
        count++;
    }
    if (allDays && (end.getDay() == 6 || end.getDay() == 0)) switch (end.getDay()) {
        case 6:
            end.setDate(end.getDate() + 2);
            break;
        case 0:
            end.setDate(end.getDate() + 1);
            break;
    }
    return end;
}
// today's Date : new Date(new Date().toDateString())
// year Start :  new Date(new Date().getFullYear(),0,1);
// year End : new Date(new Date().getFullYear(),11,31,23,59,59);
// month Start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
// month End: new Date(new Date().getFullYear(), new Date().getMonth(), 1) not done

//#region Drywall
exports.currentUser = function (req, res) {
    if (!req.isAuthenticated()) {
        res.json({});
    }
    else {
        var user = {username: req.user.username};
        if (req.user.canPlayRoleOf('admin')) {
            user.Name = req.user.roles.admin.name.full;
            user.isAdmin = true;
        }
        else if (req.user.canPlayRoleOf('account')) {
            user.Name = req.user.roles.account.name.full;
        }
        res.json(user);
    }
};
exports.signup = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);

    workflow.on('validate', function () {
        if (!req.body.username) {
            workflow.outcome.errfor.username = 'required';
        }
        else if (!/^[a-zA-Z0-9\-\_]+$/.test(req.body.username)) {
            workflow.outcome.errfor.username = 'only use letters, numbers, \'-\', \'_\'';
        }

        if (!req.body.email) {
            workflow.outcome.errfor.email = 'required';
        }
        else if (!/^[a-zA-Z0-9\-\_\.\+]+@[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_]+$/.test(req.body.email)) {
            workflow.outcome.errfor.email = 'invalid email format';
        }

        if (!req.body.password) {
            workflow.outcome.errfor.password = 'required';
        }

        if (!req.body.roles.account.name || !req.body.roles.account.name.first || !req.body.roles.account.name.last || !req.body.roles.account.name.full) {
            workflow.outcome.errfor.name = 'required'
        }

        if (workflow.hasErrors()) {
            return workflow.emit('response');
        }

        workflow.emit('duplicateUsernameCheck');
    });

    workflow.on('duplicateUsernameCheck', function () {
        req.app.db.models.User.findOne({username: req.body.username}, function (err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }

            if (user) {
                workflow.outcome.errfor.username = 'username already taken';
                return workflow.emit('response');
            }

            workflow.emit('duplicateEmailCheck');
        });
    });

    workflow.on('duplicateEmailCheck', function () {
        req.app.db.models.User.findOne({email: req.body.email.toLowerCase()}, function (err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }

            if (user) {
                workflow.outcome.errfor.email = 'email already registered';
                return workflow.emit('response');
            }

            workflow.emit('createUser');
        });
    });

    workflow.on('createUser', function () {
        req.app.db.models.User.encryptPassword(req.body.password, function (err, hash) {
            if (err) {
                return workflow.emit('exception', err);
            }

            var fieldsToSet = {
                isActive: 'yes',
                username: req.body.username,
                email: req.body.email.toLowerCase(),
                password: hash
            };
            req.app.db.models.User.create(fieldsToSet, function (err, user) {
                if (err) {
                    return workflow.emit('exception', err);
                }

                workflow.user = user;
                workflow.emit('createAccount');
            });
        });
    });

    workflow.on('createAccount', function () {
        var fieldsToSet = {
            isVerified: req.app.config.requireAccountVerification ? 'no' : 'yes',
            name: req.body.roles.account.name,
            user: {
                id: workflow.user._id,
                name: workflow.user.username
            }
        };

        req.app.db.models.Account.create(fieldsToSet, function (err, account) {
            if (err) {
                return workflow.emit('exception', err);
            }

            //update user with account
            workflow.user.roles.account = account._id;
            workflow.user.save(function (err, user) {
                if (err) {
                    return workflow.emit('exception', err);
                }
                if (app.config.sendWelcomeEmail) {
                    workflow.emit('sendWelcomeEmail');
                }
                else {
                    workflow.emit('logUserIn');
                }
            });
        });
    });

    workflow.on('sendWelcomeEmail', function () {
        req.app.utility.sendmail(req, res, {
            from: req.app.config.smtp.from.name + ' <' + req.app.config.smtp.from.address + '>',
            to: req.body.email,
            subject: 'Your ' + req.app.config.projectName + ' Account',
            htmlPath: 'welcome',
            locals: {
                username: req.body.username,
                email: req.body.email,
                loginURL: req.protocol + '://' + req.headers.host,
                projectName: req.app.config.projectName
            },
            success: function (message) {
                workflow.emit('logUserIn');
            },
            error: function (err) {
                workflow.emit('logUserIn');
            }
        });
    });
    workflow.on('logUserIn', function () {
        req._passport.instance.authenticate('local', function (err, user, info) {
            if (err) {
                return workflow.emit('exception', err);
            }

            if (!user) {
                workflow.outcome.errors.push('Login failed. That is strange.');
                return workflow.emit('response');
            }
            else {
                req.login(user, function (err) {
                    if (err) {
                        return workflow.emit('exception', err);
                    }

                    workflow.outcome.defaultReturnUrl = user.defaultReturnUrl();
                    workflow.emit('response');
                });
            }
        })(req, res);
    });
    workflow.emit('validate');
};
exports.login = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var attendance = req.app.utility.attendance(req);
    workflow.on('validateRecaptcha', function () {
        var ip = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;

        if (!req.body["recaptcha"]) {
            workflow.outcome.errors.push('The recapcha field is required.');
            //workflow.outcome.errfor.recaptcha = 'failed';
            return workflow.emit('response');
        }
        var query =
            "privatekey=" + '6LfwxgMTAAAAAP77SQfli2w_ik93f79MZFsMA8Bj-BpZ' +
            "&response=" + req.body["recaptcha"] +
            "&challenge=" + req.body["quest"] +
            "&remoteip=" + ip;
        //#region
        //require('https').get("https://www.google.com/recaptcha/api/siteverify?secret="
        //+ '6LfwxgMTAAAAAP77SQfli2w_ik93f79MZFsMA8Bj'
        //+ "&response=" + req.body["g-recaptcha-response"], function (res) {
        //    var data = "";
        //    res.on('data', function (chunk) {
        //        data += chunk.toString();
        //    });
        //    res.on('end', function () {
        //        try {
        //            var dat = JSON.parse(data);
        //            console.log(dat);
        //            if (dat.success) {
        //                workflow.emit('validate');
        //            } else {
        //                workflow.outcome.errors.push('The reCaptcha could not be verified.');
        //                workflow.outcome.errfor.recaptcha = 'failed';
        //                workflow.outcome.t = dat;
        //                return workflow.emit('response');
        //            }
        //        } catch (e) {
        //            workflow.outcome.errors.push('The reCaptcha could not be verified.');
        //            workflow.outcome.errfor.recaptcha = 'failed';
        //            workflow.outcome.t = data;
        //            return workflow.emit('response');
        //        }
        //    });
        //});
        //#endregion

        require('https')
            .get("https://www.google.com/recaptcha/api/siteverify?" + query, function (res) {
                var data = "";
                res.on('data', function (chunk) {
                    data += chunk.toString();
                });
                res.on('end', function () {
                    var dat = String(data).split('\n');
                    if (dat.length > 0 && dat[0].trim() == 'true') workflow.emit('validate');
                    else {
                        var e = '';
                        switch (dat[1]) {
                            case 'incorrect-captcha-sol':
                                e = 'reCaptcha response is incorrect.';
                                break;
                            default:
                                e = 'The reCaptcha could not be verified.';
                        }
                        workflow.outcome.errors.push(e);
                        workflow.outcome.errfor.recaptcha = 'failed';
                        workflow.outcome.t = dat;
                        return workflow.emit('response');
                    }
                });
            });
    });

    workflow.on('validate', function () {
        if (!req.body.username) {
            workflow.outcome.errfor.username = 'required';
        }

        if (!req.body.password) {
            workflow.outcome.errfor.password = 'required';
        }

        if (workflow.hasErrors()) {
            return workflow.emit('response');
        }

        workflow.emit('abuseFilter');
    });
    workflow.emit('validate');
    workflow.on('abuseFilter', function () {
        var getIpCount = function (done) {
            var conditions = {ip: req.ip};
            req.app.db.models.LoginAttempt.count(conditions, function (err, count) {
                if (err) {
                    return done(err);
                }
                done(null, count);
            });
        };

        var getIpUserCount = function (done) {
            var conditions = {ip: req.ip, user: req.body.username};
            req.app.db.models.LoginAttempt.count(conditions, function (err, count) {
                if (err) {
                    return done(err);
                }

                done(null, count);
            });
        };

        var asyncFinally = function (err, results) {
            if (err) {
                return workflow.emit('exception', err);
            }

            if (results.ip >= req.app.config.loginAttempts.forIp || results.ipUser >= req.app.config.loginAttempts.forIpAndUser) {
                workflow.outcome.errors.push('You\'ve reached the maximum number of login attempts. Please try again later.');
                return workflow.emit('response');
            }
            else {
                workflow.emit('attemptLogin');
            }
        };

        require('async').parallel({ip: getIpCount, ipUser: getIpUserCount}, asyncFinally);
    });

    workflow.on('attemptLogin', function () {
        req._passport.instance.authenticate('local', function (err, user, info) {
            if (err) {
                return workflow.emit('exception', err);
            }

            if (!user) {
                var fieldsToSet = {ip: req.ip, user: req.body.username};
                req.app.db.models.LoginAttempt.create(fieldsToSet, function (err, doc) {
                    if (err) {
                        return workflow.emit('exception', err);
                    }
                    workflow.outcome.errors.push('Username and password combination not found or your account is inactive.');
                    return workflow.emit('response');
                });
            }
            else {
                req.login(user, function (err) {
                    if (err)
                        return workflow.emit('exception', err);

                    req.app.utility.attendance(req).emit('userLoggedIn', user, req.signedCookies.provision);
                    workflow.emit('response');
                });
            }
        })(req, res);
    });

     workflow.emit('validate');
    // workflow.emit('validateRecaptcha');
};
exports.trackUserLogin = function (req, res) {
    if (req.user) return res.json({
        success: false,
        message: "Your are currently logged in. Please logout before performing this action.",
        user: req.user.username
    });
    req.body = {
        password: req.body.pass || req.query.pass,
        username: req.body.username || req.query.username
    };
    if (!req.body.username || !req.body.password)
        return res.status(400).send({
            success: false,
            message: req.body.username ? 'You must include the catch phrase' : 'Key is required'
        });
    req.app.db.models.User
        .findOne({username: req.body.username || req.query.username})
        .exec(function (e, user) {
            if (e || !user)
                return res.status(e ? 500 : 404)
                    .send({
                        success: false,
                        message: e ? 'Could not log in because of an error' : 'Key is cotaminated.'
                    });
            req.app.db.models.User
                .validatePassword(req.body.pass || req.query.pass, '$2a$10$rr3Gwei9HtXYZZxLVvmYpOKzp1/ZfH1KIdY04VqvTNRpQDec/ulGm', function (err, isValid) {
                    if (err || !isValid)
                        return res.status(err ? 500 : 403)
                            .send({
                                success: false,
                                message: err || 'Invalid catch phrase. You can\'t be seroius can you?'
                            });
                    req.app.db.models.Employee.findOne({
                        employeeId: user.username,
                        status: {$ne: 'Inactive'}
                    }, function (e, u) {
                        if (e || !u)
                            return res.status(e ? 500 : 404)
                                .send({
                                    success: false,
                                    message: e ? 'Could not log in because of an error' : 'Key is cotaminated.'
                                });
                        else
                            req.login(user, function (err) {
                                if (err) return res.status(500).send({success: false, message: err});
                                res.json({success: true, message: 'Completely inadequate.'});
                            });
                    });
                });
        })
};
exports.forgot = function (req, res, next) {
    var workflow = req.app.utility.workflow(req, res);

    workflow.on('validate', function () {
        if (!req.body.email) {
            workflow.outcome.errfor.email = 'required';
            return workflow.emit('response');
        }

        workflow.emit('generateToken');
    });

    workflow.on('generateToken', function () {
        var crypto = require('crypto');
        crypto.randomBytes(21, function (err, buf) {
            if (err) {
                return next(err);
            }

            var token = buf.toString('hex');
            req.app.db.models.User.encryptPassword(token, function (err, hash) {
                if (err) {
                    return next(err);
                }

                workflow.emit('patchUser', token, hash);
            });
        });
    });

    workflow.on('patchUser', function (token, hash) {
        var conditions = {email: req.body.email.toLowerCase()};
        var fieldsToSet = {
            resetPasswordToken: hash,
            resetPasswordExpires: Date.now() + 10000000
        };
        req.app.db.models.User.findOneAndUpdate(conditions, fieldsToSet, function (err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }

            if (!user) {
                return workflow.emit('response');
            }

            workflow.emit('sendEmail', token, user);
        });
    });

    workflow.on('sendEmail', function (token, user) {
        req.app.utility.sendmail(req, res, {
            from: req.app.config.smtp.from.name + ' <' + req.app.config.smtp.from.address + '>',
            to: user.email,
            subject: 'Reset your ' + req.app.config.projectName + ' password',
            htmlPath: 'forgot',
            locals: {
                username: user.username,
                resetLink: req.protocol + '://' + req.headers.host + '/login/reset/' + user.email + '/' + token + '/',
                projectName: req.app.config.projectName
            },
            success: function (message) {
                workflow.emit('response');
            },
            error: function (err) {
                workflow.outcome.errors.push('Error Sending: ' + err);
                workflow.emit('response');
            }
        });
    });

    workflow.emit('validate');
};
exports.reset = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);

    workflow.on('validate', function () {
        if (!req.body.password) {
            workflow.outcome.errfor.password = 'required';
        }

        if (!req.body.confirm) {
            workflow.outcome.errfor.confirm = 'required';
        }

        if (req.body.password !== req.body.confirm) {
            workflow.outcome.errors.push('Passwords do not match.');
        }

        if (workflow.hasErrors()) {
            return workflow.emit('response');
        }

        workflow.emit('findUser');
    });

    workflow.on('findUser', function () {
        var conditions = {
            email: req.params.email,
            resetPasswordExpires: {$gt: Date.now()}
        };
        req.app.db.models.User.findOne(conditions, function (err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }

            if (!user) {
                workflow.outcome.errors.push('Invalid request.');
                return workflow.emit('response');
            }

            req.app.db.models.User.validatePassword(req.params.token, user.resetPasswordToken, function (err, isValid) {
                if (err) {
                    return workflow.emit('exception', err);
                }

                if (!isValid) {
                    workflow.outcome.errors.push('Invalid request.');
                    return workflow.emit('response');
                }

                workflow.emit('patchUser', user);
            });
        });
    });

    workflow.on('patchUser', function (user) {
        req.app.db.models.User.encryptPassword(req.body.password, function (err, hash) {
            if (err) {
                return workflow.emit('exception', err);
            }

            var fieldsToSet = {password: hash, resetPasswordToken: ''};
            req.app.db.models.User.findByIdAndUpdate(user._id, fieldsToSet, function (err, user) {
                if (err) {
                    return workflow.emit('exception', err);
                }

                workflow.emit('response');
            });
        });
    });

    workflow.emit('validate');
};
exports.resetEmployeePassword = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        if (!req.params.id) {
            workflow.outcome.errors.push('Employee not selected. please select an employee to reset');
            return workflow.emit('response');
        }
        req.app.db.models.Employee.findById(req.params.id, function (err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }
            if (!user) {
                workflow.outcome.errors.push('Invalid request, user not found.');
                return workflow.emit('response');
            }
            workflow.emit('findUser', user);
        });
    });

    workflow.on('findUser', function (emp) {
        req.app.db.models.User.findOne({username: emp.employeeId}, function (err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }
            if (!user) {
                workflow.outcome.errors.push('Invalid request, user not found.');
                return workflow.emit('response');
            }
            workflow.emit('patchUser', user, emp);
        });
    });

    workflow.on('patchUser', function (user, emp) {
        req.app.db.models.User.encryptPassword(emp.firstName.toLowerCase(), function (err, hash) {
            if (err) {
                return workflow.emit('exception', err);
            }

            var fieldsToSet = {password: hash};
            req.app.db.models.User.findByIdAndUpdate(user._id, fieldsToSet, function (err, user) {
                if (err) {
                    return workflow.emit('exception', err);
                }
                workflow.outcome.message = 'Password has been reset to the default';
                new req.app.db.models.AuditLog({
                    action: 'Update',
                    description: emp.fullName() + ' Password was reset by Admin',
                    employeeId: req.user.employee.employeeId,
                    entityType: 'Employee',
                    entityId: emp.id,
                    endpoint: req.ip || req.kennaIP
                }).save();
                workflow.emit('response');
            });
        });
    });

    workflow.emit('validate');
};
exports.logout = function (req, res) {
    //if (req.signedCookies && req.signedCookies['connect.sid']) {
    //    req.sessionStore.getCollection(function (err, collection) {
    //        collection.remove({_id: req.signedCookies['connect.sid']}, {w: 0});
    //    });
    //}
    res.set('Last-Modified', new Date().toUTCString());
    req.session.destroy(function () {
        req.app.clearStore(req);
        res.cookie('connect.sid', '', {expires: new Date(Date.now() + 1000 * 30), path: '/'});
        // res.sendFile('login.html', {root: './views'});
        res.json({})
    });
    //res.cookie('connect.sid', '', {expires: new Date( Date.now() + 1000 * 30), path: '/' });
    //res.json({});
};
exports.sendVerification = function (req, res, next) {
    if (req.user.roles.account.isVerified === 'yes') {
        return res.send({success: true, message: 'You are already verified'});
    }

    var workflow = req.app.utility.workflow(req, res);

    workflow.on('validate', function () {
        if (!req.body.email) {
            workflow.outcome.errfor.email = 'required';
        }
        else if (!/^[a-zA-Z0-9\-\_\.\+]+@[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_]+$/.test(req.body.email)) {
            workflow.outcome.errfor.email = 'invalid email format';
        }

        if (workflow.hasErrors()) {
            return workflow.emit('response');
        }

        workflow.emit('duplicateEmailCheck');
    });

    workflow.on('duplicateEmailCheck', function () {
        req.app.db.models.User.findOne({
            email: req.body.email.toLowerCase(),
            _id: {$ne: req.user.id}
        }, function (err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }

            if (user) {
                workflow.outcome.errfor.email = 'email already taken';
                return workflow.emit('response');
            }

            workflow.emit('patchUser');
        });
    });

    workflow.on('patchUser', function () {
        var fieldsToSet = {email: req.body.email.toLowerCase()};
        req.app.db.models.User.findByIdAndUpdate(req.user.id, fieldsToSet, function (err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }

            workflow.user = user;
            workflow.emit('generateToken');
        });
    });

    workflow.on('generateToken', function () {
        var crypto = require('crypto');
        crypto.randomBytes(21, function (err, buf) {
            if (err) {
                return next(err);
            }

            var token = buf.toString('hex');
            req.app.db.models.User.encryptPassword(token, function (err, hash) {
                if (err) {
                    return next(err);
                }

                workflow.emit('patchAccount', token, hash);
            });
        });
    });

    workflow.on('patchAccount', function (token, hash) {
        var fieldsToSet = {verificationToken: hash};
        req.app.db.models.Account.findByIdAndUpdate(req.user.roles.account.id, fieldsToSet, function (err, account) {
            if (err) {
                return workflow.emit('exception', err);
            }

            workflow.emit('sendVerificationEmail', {
                email: workflow.user.email,
                verificationToken: token,
                onSuccess: function () {
                    workflow.emit('response');
                },
                onError: function (err) {
                    workflow.outcome.errors.push('Error Sending: ' + err);
                    workflow.emit('response');
                }
            });

        });
    });

    workflow.on('sendVerification', function (options) {
        req.app.utility.sendmail(req, res, {
            from: req.app.config.smtp.from.name + ' <' + req.app.config.smtp.from.address + '>',
            to: options.email,
            subject: 'Verify Your ' + req.app.config.projectName + ' Account',
            htmlPath: 'verification',
            locals: {
                verifyURL: req.protocol + '://' + req.headers.host + '/account/verification/' + options.verificationToken + '/',
                projectName: req.app.config.projectName
            },
            success: function () {
                options.onSuccess();
            },
            error: function (err) {
                options.onError(err);
            }
        });
    });

    workflow.emit('validate');
};
exports.verify = function (req, res, next) {
    req.app.db.models.User.validatePassword(req.params.token, req.user.roles.account.verificationToken, function (err, isValid) {
        if (!isValid) {
            return res.redirect(req.user.defaultReturnUrl());
        }

        var fieldsToSet = {isVerified: 'yes', verificationToken: ''};
        req.app.db.models.Account.findByIdAndUpdate(req.user.roles.account._id, fieldsToSet, function (err, account) {
            if (err) {
                return next(err);
            }

            return res.redirect(req.user.defaultReturnUrl());
        });
    });
};
exports.setpassword = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);

    workflow.on('validate', function () {
        if (!req.body.newPassword) {
            workflow.outcome.errors.push('New Password field is required.');
            return workflow.emit('response');
        }

        if (!req.body.confirm) {
            workflow.outcome.errors.push('Confirm Password field is required.');
            return workflow.emit('response');
        }

        if (req.body.newPassword !== req.body.confirm) {
            workflow.outcome.errors.push('Passwords do not match.');
            return workflow.emit('response');
        }
        workflow.emit('patchUser');
    });

    workflow.on('patchUser', function () {
        req.app.db.models.User.encryptPassword(req.body.newPassword, function (err, hash) {
            if (err) {
                workflow.outcome.errors.push('An error occurred while changing password.');
                return workflow.emit('response');
            }

            var fieldsToSet = {password: hash};
            req.app.db.models.User.findByIdAndUpdate(req.user.id, fieldsToSet, function (err, user) {
                if (err) {
                    workflow.outcome.errors.push('An error occurred while updating record.');
                    return workflow.emit('response');
                }
                new req.app.db.models.AuditLog({
                    action: 'Update',
                    description: 'password changed',
                    employeeId: req.user.username,
                    entityType: 'User',
                    entityId: req.user.id,
                    endpoint: req.ip || req.kennaIP
                }).save();

                user.populate('roles.admin roles.account', 'name.full', function (err, user) {
                    if (err) {
                        return workflow.emit('exception', err);
                    }
                    workflow.outcome.message = 'Password change successful.';
                    workflow.emit('response');
                });
            });
        });
    });

    workflow.emit('validate');
};
exports.listUsers = function (req, res, next) {
    var q = req.app.db.models.Employee.find({status: {$ne: 'Inactive'}}).populate('department');
    q.exec(function (err, results) {
        if (err) {
            return next(err);
        }
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send({employees: results, byDepartment: require('underscore').groupBy(results, 'department')});
    });
};
exports.createUser = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);

    workflow.on('validate', function () {
        if (!req.body.username) {
            workflow.outcome.errfor.username = 'required';
        }
        else if (!/^[a-zA-Z0-9\-\_]+$/.test(req.body.username)) {
            workflow.outcome.errfor.username = 'only use letters, numbers, \'-\', \'_\'';
        }

        if (!req.body.email) {
            workflow.outcome.errfor.email = 'required';
        }
        else if (!/^[a-zA-Z0-9\-\_\.\+]+@[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_]+$/.test(req.body.email)) {
            workflow.outcome.errfor.email = 'invalid email format';
        }

        if (!req.body.password) {
            workflow.outcome.errfor.password = 'required';
        }

        if (req.body.roles.account) {
            if (!req.body.roles.account.name || !req.body.roles.account.name.first || !req.body.roles.account.name.last || !req.body.roles.account.name.full) {
                workflow.outcome.errfor.name = 'required'
            }
        }

        if (req.body.roles.admin) {
            if (!req.body.roles.admin.name || !req.body.roles.admin.name.first || !req.body.roles.admin.name.last || !req.body.roles.admin.name.full) {
                workflow.outcome.errfor.name = 'required'
            }
        }

        if (workflow.hasErrors()) {
            return workflow.emit('response');
        }

        workflow.emit('duplicateUsernameCheck');
    });

    workflow.on('duplicateUsernameCheck', function () {
        req.app.db.models.User.findOne({username: req.body.username}, function (err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }

            if (user) {
                workflow.outcome.errors.push('That username is already taken.');
                return workflow.emit('response');
            }

            workflow.emit('createUser');
        });
    });

    workflow.on('createUser', function () {
        req.app.db.models.User.encryptPassword(req.body.password, function (err, hash) {
            if (err) {
                return workflow.emit('exception', err);
            }

            var fieldsToSet = {
                isActive: 'yes',
                username: req.body.username,
                email: req.body.email.toLowerCase(),
                password: hash
            };
            req.app.db.models.User.create(fieldsToSet, function (err, user) {
                if (err) {
                    return workflow.emit('exception', err);
                }

                workflow.user = user;
                if (req.body.roles.account) {
                    workflow.emit('createAccount');
                }
                if (req.body.roles.admin) {
                    workflow.emit('createAdmin');
                }
            });
        });
    });

    workflow.on('createAccount', function () {
        var fieldsToSet = {
            isVerified: req.app.config.requireAccountVerification ? 'no' : 'yes',
            name: req.roles.account.name,
            user: {
                id: workflow.user._id,
                name: workflow.user.username
            },
            userCreated: {
                id: req.user._id,
                name: req.user.username,
                time: new Date().toISOString()
            }
        };

        req.app.db.models.Account.create(fieldsToSet, function (err, account) {
            if (err) {
                return workflow.emit('exception', err);
            }

            //update user with account
            workflow.user.roles.account = account._id;
            workflow.user.save(function (err, user) {
                if (err) {
                    return workflow.emit('exception', err);
                }
                if (app.config.sendWelcomeEmail) {
                    workflow.emit('sendWelcomeEmail');
                }
            });
        });
    });

    workflow.on('sendWelcomeEmail', function () {
        req.app.utility.sendmail(req, res, {
            from: req.app.config.smtp.from.name + ' <' + req.app.config.smtp.from.address + '>',
            to: req.body.email,
            subject: 'Your ' + req.app.config.projectName + ' Account',
            htmlPath: 'welcome',
            locals: {
                username: req.body.username,
                email: req.body.email,
                loginURL: req.protocol + '://' + req.headers.host,
                projectName: req.app.config.projectName
            },
            success: function (message) {
                workflow.emit('response');
            },
            error: function (err) {
                workflow.emit('response');
            }
        });
    });

    workflow.on('createAdmin', function () {
        var fieldsToSet = {
            name: req.body.roles.admin.name,
            groups: req.body.roles.admin.groups,
            permissions: req.body.roles.admin.permissions,
            user: {
                id: workflow.user._id,
                name: workflow.user.username
            },
            userCreated: {
                id: req.user._id,
                name: req.user.username,
                time: new Date().toISOString()
            }
        };

        req.app.db.models.Admin.create(fieldsToSet, function (err, admin) {
            if (err) {
                return workflow.emit('exception', err);
            }

            //update user with account
            workflow.user.roles.admin = admin._id;
            workflow.user.save(function (err, user) {
                if (err) {
                    return workflow.emit('exception', err);
                }
                if (app.config.sendWelcomeEmail) {
                    workflow.emit('sendWelcomeEmail');
                }
            });
        });
    });

    workflow.emit('validate');
};
exports.getUser = function (req, res, next) {
    req.app.db.models.User.findById(req.params.id).populate('roles.admin').populate('roles.account').exec(function (err, user) {
        if (err) {
            return next(err);
        }
        res.send(user)
    });
};
exports.getUsersPlusRequest = function (req, res, next) {
    var underscore = require('underscore');
    var start = new Date(new Date().getFullYear(), 0, 1), end = new Date(new Date().getFullYear() + 1, 0, 1);
    var workflow = req.app.utility.workflow(req, res);
    workflow.employees = [];
    workflow.on('getEmployees', function () {
        var q = req.app.db.models.Employee.find().populate('department');
        q.exec(function (err, emps) {
            if (err) {
                return next(err);
            }
            else {
                emps.forEach(function (item) {
                    var t = item.toObject();
                    t.leaveRequests = workflow.leaveRequests[item.id] || [];
                    workflow.employees.push(t);
                });
                workflow.emit('sendResponse');
            }
        });
    });
    workflow.on('getLeaveRequest', function () {
        req.app.db.models.LeaveRequest.find({date: {$gte: start, $lte: end}}, '-byAdmin ', function (err, pd) {
            if (err) return workflow.emit('exception', err);
            else {
                workflow.leaveRequests = underscore.groupBy(pd, 'employee');
                workflow.emit('getEmployees');
            }
        })
    });
    workflow.on('sendResponse', function () {
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send({employees: workflow.employees, byDepartment: underscore.groupBy(workflow.employees, 'department')});
    });
    workflow.emit('getLeaveRequest');
};
exports.updateUser = function (req, res, next) {
    var workflow = req.app.utility.workflow(req, res);

    workflow.on('validate', function () {
        if (!req.body.isActive) {
            req.body.isActive = 'no';
        }

        if (!req.body.username) {
            workflow.outcome.errfor.username = 'required';
        }
        else if (!/^[a-zA-Z0-9\-\_]+$/.test(req.body.username)) {
            workflow.outcome.errfor.username = 'only use letters, numbers, \'-\', \'_\'';
        }

        if (!req.body.email) {
            workflow.outcome.errfor.email = 'required';
        }
        else if (!/^[a-zA-Z0-9\-\_\.\+]+@[a-zA-Z0-9\-\_\.]+\.[a-zA-Z0-9\-\_]+$/.test(req.body.email)) {
            workflow.outcome.errfor.email = 'invalid email format';
        }

        if (req.body.roles.account) {
            if (!req.body.roles.account.name || !req.body.roles.account.name.first || !req.body.roles.account.name.last || !req.body.roles.account.name.full) {
                workflow.outcome.errfor.name = 'required'
            }
        }

        if (req.body.roles.admin) {
            if (!req.body.roles.admin.name || !req.body.roles.admin.name.first || !req.body.roles.admin.name.last || !req.body.roles.admin.name.full) {
                workflow.outcome.errfor.name = 'required'
            }
        }

        if (workflow.hasErrors()) {
            return workflow.emit('response');
        }

        workflow.emit('duplicateUsernameCheck');
    });

    workflow.on('duplicateUsernameCheck', function () {
        req.app.db.models.User.findOne({username: req.body.username, _id: {$ne: req.params.id}}, function (err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }

            if (user) {
                workflow.outcome.errfor.username = 'username already taken';
                return workflow.emit('response');
            }

            workflow.emit('duplicateEmailCheck');
        });
    });

    workflow.on('duplicateEmailCheck', function () {
        req.app.db.models.User.findOne({
            email: req.body.email.toLowerCase(),
            _id: {$ne: req.params.id}
        }, function (err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }

            if (user) {
                workflow.outcome.errfor.email = 'email already taken';
                return workflow.emit('response');
            }

            workflow.emit('patchUser');
        });
    });

    workflow.on('patchUser', function () {
        var fieldsToSet = {
            isActive: req.body.isActive,
            username: req.body.username,
            email: req.body.email.toLowerCase()
        };

        req.app.db.models.User.findByIdAndUpdate(req.params.id, fieldsToSet, function (err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }

            workflow.emit('patchAdmin', user);
        });
    });

    workflow.on('patchAdmin', function (user) {
        if (user.roles.admin) {
            var fieldsToSet = {
                user: {
                    id: req.params.id,
                    name: user.username
                },
                name: req.body.roles.admin.name,
                groups: req.body.roles.admin.groups,
                permissions: req.body.roles.admin.permissions
            };
            req.app.db.models.Admin.findByIdAndUpdate(user.roles.admin, fieldsToSet, function (err, admin) {
                if (err) {
                    return workflow.emit('exception', err);
                }

                workflow.emit('patchAccount', user);
            });
        }
        else {
            workflow.emit('patchAccount', user);
        }
    });

    workflow.on('patchAccount', function (user) {
        if (user.roles.account) {
            var fieldsToSet = {
                user: {
                    id: req.params.id,
                    name: user.username
                },
                name: req.roles.account.name
            };
            req.app.db.models.Account.findByIdAndUpdate(user.roles.account, fieldsToSet, function (err, account) {
                if (err) {
                    return workflow.emit('exception', err);
                }

                workflow.emit('populateRoles', user);
            });
        }
        else {
            workflow.emit('populateRoles', user);
        }
    });

    workflow.on('populateRoles', function (user) {
        user.populate('roles.admin roles.account', 'name.full', function (err, populatedUser) {
            if (err) {
                return workflow.emit('exception', err);
            }

            workflow.outcome.user = populatedUser;
            workflow.emit('response');
        });
    });

    workflow.emit('validate');
};
exports.resetPassword = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);

    workflow.on('validate', function () {
        if (!req.body.newPassword) {
            workflow.outcome.errfor.newPassword = 'required';
        }

        if (!req.body.confirm) {
            workflow.outcome.errfor.confirm = 'required';
        }

        if (req.body.newPassword !== req.body.confirm) {
            workflow.outcome.errors.push('Passwords do not match.');
        }

        if (workflow.hasErrors()) {
            return workflow.emit('response');
        }

        workflow.emit('patchUser');
    });

    workflow.on('patchUser', function () {
        req.app.db.models.User.encryptPassword(req.body.newPassword, function (err, hash) {
            if (err) {
                return workflow.emit('exception', err);
            }

            var fieldsToSet = {password: hash};
            req.app.db.models.User.findByIdAndUpdate(req.params.id, fieldsToSet, function (err, user) {
                if (err) {
                    return workflow.emit('exception', err);
                }

                user.populate('roles.admin roles.account', 'name.full', function (err, user) {
                    if (err) {
                        return workflow.emit('exception', err);
                    }

                    workflow.outcome.user = user;
                    workflow.outcome.newPassword = '';
                    workflow.outcome.confirm = '';
                    workflow.emit('response');
                });
            });
        });
    });

    workflow.emit('validate');
};
exports.deleteUser = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);

    workflow.on('validate', function () {
        if (!req.user.roles.admin.isMemberOf('root')) {
            workflow.outcome.errors.push('You may not delete users.');
            return workflow.emit('response');
        }

        if (req.user._id === req.params.id) {
            workflow.outcome.errors.push('You may not delete yourself from user.');
            return workflow.emit('response');
        }

        workflow.emit('deleteUser');
    });

    workflow.on('deleteUser', function (err) {
        req.app.db.models.User.findByIdAndRemove(req.params.id, function (err, user) {
            if (err) {
                return workflow.emit('exception', err);
            }

            workflow.emit('response');
        });
    });

    workflow.emit('validate');
};
exports.listGroups = function (req, res, next) {
    var q = req.app.db.models.AdminGroup.find();
    q.exec(function (err, results) {
        if (err) {
            return next(err);
        }
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(results);
    });
};
exports.createGroup = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);

    workflow.on('validate', function () {
        if (!req.user.roles.admin.isMemberOf('root')) {
            workflow.outcome.errors.push('You may not create admin groups.');
            return workflow.emit('response');
        }

        if (!req.body.name) {
            workflow.outcome.errors.push('Please enter a name.');
            return workflow.emit('response');
        }

        workflow.emit('duplicateAdminGroupCheck');
    });

    workflow.on('duplicateAdminGroupCheck', function () {
        req.app.db.models.AdminGroup.findById(req.app.utility.slugify(req.body.name)).exec(function (err, adminGroup) {
            if (err) {
                return workflow.emit('exception', err);
            }

            if (adminGroup) {
                workflow.outcome.errors.push('That group already exists.');
                return workflow.emit('response');
            }

            workflow.emit('createAdminGroup');
        });
    });

    workflow.on('createAdminGroup', function () {
        var fieldsToSet = {
            _id: req.app.utility.slugify(req.body.name),
            name: req.body.name
        };
        if (req.body.permissions) {
            fieldsToSet.permissions = req.body.permissions;
        }

        req.app.db.models.AdminGroup.create(fieldsToSet, function (err, adminGroup) {
            if (err) {
                return workflow.emit('exception', err);
            }

            workflow.outcome.record = adminGroup;
            return workflow.emit('response');
        });
    });

    workflow.emit('validate');
};
exports.getGroup = function (req, res, next) {
    req.app.db.models.AdminGroup.findById(req.params.id).exec(function (err, adminGroup) {
        if (err) {
            return next(err);
        }

        res.send(adminGroup);
    });
};
exports.updateGroup = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);

    workflow.on('validate', function () {
        if (!req.user.roles.admin.isMemberOf('root')) {
            workflow.outcome.errors.push('You may not update admin groups.');
            return workflow.emit('response');
        }

        if (!req.body.name) {
            workflow.outcome.errfor.name = 'required';
            return workflow.emit('response');
        }

        workflow.emit('patchAdminGroup');
    });

    workflow.on('patchAdminGroup', function () {
        var fieldsToSet = {
            name: req.body.name
        };
        if (req.body.permissions) {
            fieldsToSet.permissions = req.body.permissions;
        }

        req.app.db.models.AdminGroup.findByIdAndUpdate(req.params.id, fieldsToSet, function (err, adminGroup) {
            if (err) {
                return workflow.emit('exception', err);
            }

            workflow.outcome.adminGroup = adminGroup;
            return workflow.emit('response');
        });
    });

    workflow.emit('validate');
};
exports.deleteGroup = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);

    workflow.on('validate', function () {
        if (!req.user.roles.admin.isMemberOf('root')) {
            workflow.outcome.errors.push('You may not delete admin groups.');
            return workflow.emit('response');
        }

        workflow.emit('deleteAdminGroup');
    });

    workflow.on('deleteAdminGroup', function (err) {
        req.app.db.models.AdminGroup.findByIdAndRemove(req.params.id, function (err, adminGroup) {
            if (err) {
                return workflow.emit('exception', err);
            }

            workflow.emit('response');
        });
    });

    workflow.emit('validate');
};
//#endregion

exports.profile = function (req, res) {
    if (!req.user || (req.user.employee || {}).status == 'Inactive') return res.status(401).end();
    var t = req.user.toObject();
    delete t.password;
    delete t.timeCreated;
    t = t || {};
    req.app.db.models.Employee.findById(t.employee).populate('experiences educations skills dependants department')
        .exec(function (err, emp) {
            res.json(req.app.kenna.setupRights(emp, t, req.app));
        });
};

exports.updateProfile = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);

    workflow.on('validate', function () {
        if (!req.body.first) {
            workflow.outcome.errfor.first = 'required';
        }

        if (!req.body.last) {
            workflow.outcome.errfor.last = 'required';
        }

        if (workflow.hasErrors()) {
            return workflow.emit('response');
        }

        workflow.emit('patchAccount');
    });

    workflow.on('patchAccount', function () {
        var fieldsToSet = {
            name: {
                first: req.body.first,
                middle: req.body.middle,
                last: req.body.last,
                full: req.body.first + ' ' + req.body.last
            },
            company: req.body.company,
            phone: req.body.phone,
            zip: req.body.zip
        };
        var options = {select: 'name company phone zip'};

        req.app.db.models.Account.findByIdAndUpdate(req.user.roles.account.id, fieldsToSet, options, function (err, account) {
            if (err) {
                return workflow.emit('exception', err);
            }

            workflow.outcome.account = account;
            return workflow.emit('response');
        });
    });

    workflow.emit('validate');
};
exports.getEmployees = function (req, res) {
    req.app.db.models.Employee.find({status: {$ne: 'Inactive'}}, 'firstName employeeId lastName department designation')
        .populate('department', 'name')
        .sort({firstName:1, lastName: 1})
        .exec(function (err, emps) {
            if (err) res.json([]); else res.json(emps);
        });
};
exports.saveOrganisation = function (req, res) {
    var org = req.body;
    if (org._id) {
        req.app.db.models.Organisation.findById(org._id, function (er, y) {
            if (er || !y) return res
                .status(er ? 500 : 404)
                .send(er ? 'Organisation retrieve error.' : 'Organisation not found.');
            req.app.kenna.utility.populate(y, org);
            y.save(function (err, t) {
                console.log(err, t);
                if (t) res.json({success: true, item: t, message: 'Organisation was successfully updated'});
                else res.status(500).send('error occured while saving organisation');
            });
        });
    } else {
        req.app.db.models.Organisation.create({
            name: org.name,
            designations: org.designations,
            orgType: 'Department'
        }, function (er, y) {
            if (er) return res.status(500).send('An error occurred while creating organisation.');
            else res.json({success: true, item: y, message: 'Organisation was successfully created'});
        });
    }
};
exports.deleteOrganisation = function (req, res) {
    if (req.params.id)
        req.app.db.models.Organisation.findByIdAndRemove(req.params.id, function (er, y) {
            if (!er) res.json({success: true, message: 'Organisation was successfully deleted'});
            else res.status(500).send('error occured while deleting organisation');
        });
    else res.json({success: false, message: 'Organisation id not supplied'});
};
exports.getOrganisations = function (req, res) {
    req.app.db.models.Organisation.find(function (err, results) {
        if (err) return res.status(500).send('Could not retrieve organisations');
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.json(results);
    });
};
exports.getSuperiors = function (req, res) {
    var async = require('async');
    var m = {};
    async.parallel([
        function (cb) {
            req.app.db.models.Employee.find(
                {access: {$lt: req.user.employee.access}, status: {$ne: 'Inactive'}}, 'employeeId firstName lastName', function (err, emps) {
                    if (emps) {
                        var r = [];
                        emps.forEach(function (item) {
                            r.push({
                                name: item.fullName(), code: item.id, employeeId: item.employeeId
                            });
                        });
                        m.superiors = r;
                    }
                    cb();
                });
        }, function (cb) {
            if (req.user.employee.supervisor)
                req.app.db.models.Employee.findById(req.user.employee.supervisor, 'employeeId firstName lastName', function (err, item) {
                    if (item) {
                        m.supervisor = {
                            name: item.fullName(), code: item.id, employeeId: item.employeeId
                        };
                    }
                    cb();
                });
            else cb();
        }
    ], function (e, r) {
        res.json(m);
    });
};
exports.getSubordinates = function (req, res) {
    req.app.db.models.Employee.find(
        {
            access: {$gt: req.user.employee.access},
            status: {$ne: 'Inactive'}
        }, 'employeeId firstName lastName', function (err, emps) {
            if (err) return res.status(500).send('Could not retrieve access subordinates');
            else {
                var r = [];
                emps.forEach(function (item) {
                    r.push({
                        name: item.fullName(), code: item.id, employeeId: item.employeeId
                    });
                });
            }
            res.json(r);
        });
};
//{$or: [{status: null}, {status: 'Active'}]}
exports.getRequests = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var result = {};
    require('async').parallel([
        function (cb) {
            req.app.db.models.LeaveRequest.find({employee: req.user.employee.id}, '-byAdmin ', function (err, pd) {
                if (err) cb(err);
                else {
                    result.leave = pd;
                    cb();
                }
            });
        },
        function (cb) {
            req.app.db.models.PettyCash.find({employee: req.user.employee.id}, '-pdNotes -modeOfPayment -cashReleaseCode -cashReleasedBy')
                .sort({incurred: -1})
                .exec(function (err, pc) {
                    if (err) return cb(err);
                    else {
                        result.cash = require('underscore').groupBy(pc, 'status');
                        cb();
                    }
                });
        },
        function (cb) {
            req.app.db.models.OutOffice.find({employee: req.user.employee.id}, '-pdNotes -modeOfPayment -cashReleaseCode -cashReleasedBy', function (err, pc) {
                if (err) return cb(err);
                else {
                    result.outoffice = require('underscore').groupBy(pc, 'type');
                    cb();
                }
            });
        }
    ], function () {
        res.json(result);
    });
    workflow.on('leave', function () {
        req.app.db.models.LeaveRequest.find({employee: req.user.employee.id}, '-byAdmin ', function (err, pd) {
            if (err) return workflow.emit('exception', err);
            else {
                result.leave = pd;
                workflow.emit('sendresponse');
            }
        });
    });

    workflow.on('cash', function () {
        req.app.db.models.PettyCash.find({employee: req.user.employee.id}, '-pdNotes -modeOfPayment -cashReleaseCode -cashReleasedBy', function (err, pc) {
            if (err) return workflow.emit('exception', err);
            else {
                result.cash = require('underscore').groupBy(pc, 'status');
                workflow.emit('sendresponse');
            }
        })
    });

    workflow.on('sendresponse', function () {
        if (result.leave && result.cash) res.json(result);
    });
};
exports.getSubRequests = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var result = {};

    require('async').parallel([
        function (cb) {
            req.app.db.models.LeaveRequest
                .find({toApprove: req.user.employee.id, status: 'Pre-Approval'}, '-byAdmin ')
                .populate('employee', 'leaveStatus gender')
                .exec(function (err, pd) {
                    if (err) return cb(err);
                    result.leave = pd;
                    cb();
                });
        },
        function (cb) {
            req.app.db.models.PettyCash.find({
                toApprove: req.user.employee.id,
                status: 'Pre-Approval'
            }, '-pdNotes -modeOfPayment')
                .sort({incurred: -1})
                .exec(function (err, pc) {
                    if (err) return cb(err);
                    result.cash = pc;
                    cb();
                });
        },
        function (cb) {
            req.app.db.models.OutOffice.find({toApprove: req.user.employee.id, status: 'Pre-Approval'})
                .sort({dateCreated: -1})
                .exec(function (err, pc) {
                    if (err) return cb(err);
                    else {
                        result.outoffice = pc;
                        cb();
                    }
                });
        }
    ], function () {
        res.json(result);
    });
};
exports.getAllRequests2 = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var result = {};

    workflow.on('leave', function () {
        req.app.db.models.LeaveRequest.find(function (err, pd) {
            if (err) return workflow.emit('exception', err);
            else {
                result.leave = pd;
                result.leaveGroup = require('underscore').groupBy('employee');
                workflow.emit('sendresponse');
            }
        });
    });
    workflow.on('cash', function () {
        req.app.db.models.PettyCash.find(function (err, pc) {
            if (err) return workflow.emit('exception', err);
            else {
                result.cash = require('underscore').groupBy(pc, 'status');
                workflow.emit('sendresponse');
            }
        })
    });

    workflow.on('sendresponse', function () {
        if (result.leave && result.cash) res.json(result);
    });
    workflow.emit('cash');
    workflow.emit('leave');
};
exports.getAllRequests = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var result = {};

    workflow.on('leave', function () {
        req.app.db.models.LeaveRequest.find(function (err, pd) {
            if (err) return workflow.emit('exception', err);
            else {
                result.leave = pd;
                result.leaveGroup = require('underscore').groupBy('employee');
                workflow.emit('sendresponse');
            }
        });
    });
    workflow.on('cash', function () {
        req.app.db.models.PettyCash.find(function (err, pc) {
            if (err) return workflow.emit('exception', err);
            else {
                result.cash = require('underscore').groupBy(pc, 'status');
                workflow.emit('sendresponse');
            }
        })
    });
    workflow.on('cashRequests', function () {
        var st = new Date(2016, 11, 1);
        req.app.db.models.PettyCash
            .aggregate([
                {
                    $match: {
                        dateRequested:{$gte: st}
                    }
                },
                {
                    $group: {
                        _id: {month: {$month: "$dateRequested"}, year: {$year: "$dateRequested"}, status: "$status"},
                        item: {$push: "$$CURRENT"}
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
                        _id: {month: "$month", year: "$year"},
                        status: {$push: "$$CURRENT"}
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
                        months: {$push: "$$CURRENT"},
                        min: {$min: "$month"},
                        max: {$max: "$month"}
                    }
                },
                {$sort: {_id: -1}}], function (err, pc) {
                if (err)
                    return workflow.emit('exception', err);
                result.cashRequests = pc;
                workflow.emit('sendresponse');
            });
    });
    workflow.on('sendresponse', function () {
        if (result.leave && result.cash && result.cashRequests) res.json(result);
    });
    workflow.emit('cash');
    workflow.emit('leave');
    workflow.emit('cashRequests');
};

exports.getHolidays = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('getData', function () {
        req.app.db.models.Holiday.find(function (err, hols) {
            if (err) return workflow.emit('exception', err);
            else {
                workflow.result = hols;
                workflow.emit('sendResponse');
            }
        });
    });
    workflow.on('sendResponse', function () {
        res.json(workflow.result);
    });
    workflow.emit('getData');
};
exports.saveHoliday = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);

    // var formidable = require('formidable');
    //
    // var form = new formidable.IncomingForm();
    //
    // form.parse(req, function(err, fields, files) {
    //     console.log(fields, files);
    //     return res.json({success: true, fields: fields})
    //
    // });

    // console.log("Save Holiday -->",req.body, req.files, req.file);


    workflow.on('validate', function () {
        var holiday = req.body;
        ['days', 'start', 'name', 'resume']
            .forEach(function (item) {
                if (!holiday[item])
                    workflow.outcome.errfor[item] = 'required';
            });
        if (workflow.hasErrors()) {
            workflow.outcome.errors.push('Please ensure that all required fields are entered.');
            return workflow.emit('response');
        }
        else {
            holiday.resumption = req.app.kenna.utility.nextDay(holiday.start, holiday.days).toDateString();
            workflow.holiday = holiday;
            if (holiday._id) workflow.emit('update'); else workflow.emit('create');
        }
    });
    workflow.on('create', function () {
        req.app.db.models.Holiday.create(workflow.holiday, function (err, item) {
            if (err) return workflow.emit('exception', err);
            else {
                workflow.outcome.message = 'Holiday successfully added';
                workflow.outcome.success = true;
                workflow.emit('response');
            }
        });
    });
    workflow.on('update', function () {
        req.app.db.models.Holiday.findByIdAndUpdate(workflow.holiday._id, workflow.holiday, function (err, item) {
            if (err) return workflow.emit('exception', err);
            else {
                workflow.outcome.message = 'Holiday successfully modified';
                workflow.outcome.success = true;
                workflow.emit('response');
            }
        });
    });
    workflow.emit('validate');
};

exports.getAllEvents = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var result = [];
    var id = 0;
    var limit = new Date().addDay(-365);
    var date = new Date().toDate();
    // var d = date.getDate();
    // var m = date.getMonth();
    // var y = date.getFullYear();
    // date = new Date(y, m, d);
    function getTime(date, time) {
        var h = parseInt(time.substr(0, 2));
        var m = parseInt(time.substr(3, 5));
        var isAm = time.substr(5, 7) === 'AM';
        var r = new Date();
        r.setHours(isAm ? h : h + 12);
        r.setMinutes(m);
        return r;
    };
    var async = require('async');
    async.parallel([
        function (cb) {
            req.app.db.models.Holiday.find({start: {$gte: limit}},function (err, hols) {
                result = result.concat((hols || []).map(function (item) {
                    return {
                        title: item.name,
                        start: item.start,
                        end: req.app.kenna.utility.nextDay(item.start, item.days - 1),
                        className: 'holidayEvent',
                        allDay: true,
                    };
                }));
                cb();
            });
        },
        function (cb) {
            req.app.db.models.LeaveRequest.find({start: {$gte: limit}, status: 'Approved'}, function (err, lvs) {
                result = result.concat((lvs || []).map(function (item) {
                    var u = '';
                    var end = req.app.kenna.utility.nextDay(item.start, item.days - 1, item.type === 'Parenting');

                    if (item.start.getTime() > date) u = ' will be on '; else if (end < date) u = ' was on '; else u = ' is on ';
                    var title = item.requester;
                    var idx = ++id;
                    return {
                        title: item.requester + u + item.type + ' Leave',
                        start: item.start,
                        end: end,
                        className: item.type.toLowerCase() + 'Event',
                        allDay: true
                    };
                }));
                cb();
            });
        },
        function (cb) {
            req.app.db.models.Training.find(function (err, lvs) {
                result = result.concat((lvs || []).map(function (item) {
                    return {
                        title: 'Training - ' + item.title,
                        start: getTime(item.date, item.start),
                        end: getTime(item.date, item.end),
                        className: 'trainingEvent'
                    };
                }));
                cb();
            });
        },
        function (cb) {
            if (!req.user || !req.user.employee || (!req.user.employee.rights.isAdmin && !req.user.employee.rights.isCounsel))return cb();
            var query = req.user.employee.rights.isCounsel ?
            {'$or': [{lead: req.user.employee.id}, {members: req.user.employee.id}]} :
            {};
            req.app.db.models.Matter.find(query, function (err, lvs) {
                result = result.concat((lvs || []).map(function (item) {
                    return {
                        title: 'Case - ' + item.title,
                        start: item.nextHearing,
                        end: item.nextHearing,
                        className: 'caseEvent',
                        allDay: true
                    };
                }));
                cb();
            });
        }
    ], function () {
        res.json(result);
    });
};
exports.getEvents = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var id = 0;
    workflow.result = [];
    var date = new Date();
    var d = date.getDate();
    var m = date.getMonth();
    var y = date.getFullYear();
    date = new Date(y, m, d);
    workflow.on('getHolidayEvents', function () {
        req.app.db.models.Holiday.find({}, function (err, hols) {
            if (err) return workflow.emit('exception', err);
            else {
                hols.forEach(function (item) {
                    var f = {
                        title: item.name,
                        start: item.start,
                        end: req.app.kenna.utility.nextDay(item.start, item.days - 1),
                        className: 'holidayEvent',
                        allDay: true,
                    };
                    workflow.result.push(f);
                });
                workflow.emit('sendResponse');
            }
        });
    });
    workflow.on('getLeaveEvents', function () {
        req.app.db.models.LeaveRequest.find({status: 'Approved'}, function (err, lvs) {
            if (err) {
                return workflow.emit('exception', err);
            }
            else {
                lvs.forEach(function (item) {
                    var u = '';
                    var end = req.app.kenna.utility.nextDay(item.start, item.days - 1, item.type == 'Parenting');
                    if (item.start.getTime() > date) u = ' will be on '; else if (end < date) u = ' was on '; else u = ' is on ';
                    var title = item.requester;
                    var idx = ++id;
                    var f = {
                        title: item.requester + u + item.type + ' Leave',
                        start: item.start,
                        end: end, allDay: true,
                        className: 'leaveEvent'
                    };
                    workflow.result.push(f)
                });
                workflow.emit('getHolidayEvents');
            }
        });

    });
    workflow.on('sendResponse', function () {
        res.send(workflow.result);
    });
    workflow.emit('getLeaveEvents');
};
exports.getEmployeeEvents = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var id = 0;
    var result = [];
    var date = new Date();
    var d = date.getDate();
    var m = date.getMonth();
    var y = date.getFullYear();
    date = new Date(y, m, d);
    var async = require('async');
    async.parallel([
        function (cb) {
            req.app.db.models.Holiday.find(function (err, hols) {
                (hols || []).forEach(function (item) {
                    var f = {
                        title: item.name,
                        start: item.start,
                        end: req.app.kenna.utility.nextDay(item.start, item.days - 1),
                        className: 'holidayEvent'
                    };
                    result.push(f);
                });
                cb();
            });
        },
        function (cb) {
            req.app.db.models.LeaveRequest.find({
                status: 'Approved',
                employee: req.user.employee.id
            }, function (err, lvs) {
                (lvs || []).forEach(function (item) {
                    var u = '';
                    var end = req.app.kenna.utility.nextDay(item.start, item.days - 1, item.type == 'Parenting');
                    if (item.start.getTime() > date) u = ' will be on '; else if (end < date) u = ' was on '; else u = ' is on ';
                    var title = item.requester;
                    var idx = ++id;
                    var f = {
                        title: item.requester + u + item.type + ' Leave',
                        start: item.start,
                        end: end,
                        className: 'leaveEvent'
                    };
                    result.push(f)
                });
                cb();
            });
        },
        function (cb) {
            req.app.db.models.Training.find({invited: req.user.employee.id}, function (err, lvs) {
                (lvs || []).forEach(function (item) {
                    var f = {
                        title: 'Training - ' + item.title,
                        start: item.start,
                        end: item.end,
                        className: 'trainingEvent'
                    };
                    result.push(f)
                });
                cb();
            });
        }
    ], function () {
        res.json(workflow.result);
    });
};
exports.getSupervisors = function (req, res) {
    var async = require('async');
    async.parallel([
        function (cb) {
            req.app.db.models.Employee.find({status: {$ne: 'Inactive'}}, 'firstName lastName designation subordinates supervisor')
                .populate('subordinates', 'firstName lastName designation')
                .exec(function (err, r) {
                    if (err) cb(err);
                    else {
                        var result = [];
                        r.forEach(function (item) {
                            if ((item.subordinates || []).length > 0) result.push(item);
                        });
                        cb(null, result);
                    }
                });
        }, function (cb) {
            req.app.db.models.Employee.find({status: {$ne: 'Inactive'}}, 'firstName lastName designation subordinates supervisor')
                .populate('supervisor', 'firstName lastName designation')
                .exec(function (err, r) {
                    if (err) cb(err);
                    else cb(null, r);
                });
        }
    ], function (er, data) {
        if (er) res.status(500).send(er);
        else res.json({emps: data[1], sup: data[0]});
    });
};
exports.xxmakeSupervisor = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var supervisor = req.body.sup;
        var subordinates = req.body.sub;
        ['employee', 'name']
            .forEach(function (item) {
                if (!supervisor[item])
                    workflow.outcome.errfor[item] = 'required';
            });
        for (var v in supervisor) {
            if (['_id', 'id'].indexOf(v) >= 0) delete supervisor[v];
        }
        if (workflow.hasErrors()) {
            workflow.outcome.errors.push('Please ensure that all required fields are entered.');
            return workflow.emit('response');
        }
        else {
            workflow.supervisor = supervisor;
            workflow.emit('create');
        }
    });
    workflow.on('create', function () {
        req.app.db.models.Supervisor.findOne({employee: workflow.supervisor.employee}, function (err, exp) {
            if (err) {
                return workflow.emit('exception', err);
            }
            else if (exp) {
                workflow.outcome.errors.push('Employee is already a supervisor.');
                return workflow.emit('response');
            } else
                req.app.db.models.Supervisor.create(workflow.supervisor, function (err, exp) {
                    if (err) {
                        return workflow.emit('exception', err);
                    }
                    else {
                        workflow.outcome.item = exp;
                        workflow.outcome.success = true;
                        workflow.outcome.message = 'Supervisor successfully added';
                        workflow.emit('response');
                    }
                });
        });
    });
    workflow.emit('validate');
};
exports.addSupervisorSubs = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var async = require('async');
    workflow.on('validate', function () {
        workflow.supervisor = req.body;
        workflow.subordinates = req.body.subordinates;
        workflow.newSubs = [];
        workflow.passed = workflow.failed = workflow.empty = 0;
        workflow.emit('getSupervisor');
    });
    workflow.on('getSupervisor', function () {
        req.app.db.models.Employee.findById(workflow.supervisor._id, function (err, superv) {
            if (err || !superv) cb(err || 'Supervisor (Employee) was not found.');
            else {
                async.parallel([
                    function (cb) { //Get new subs
                        req.app.db.models.Employee.find({
                            _id: {$in: workflow.subordinates},
                            supervisor: {$ne: workflow.supervisor._id}
                        }, function (err, ex) {
                            cb(err, ex);
                        });
                    },
                    function (cb) { //get removed subs
                        req.app.db.models.Employee.find({
                            _id: {$nin: workflow.subordinates},
                            supervisor: superv.id
                        }, function (err, ex) {
                            cb(err, ex);
                        });
                    }
                ], function (err, data) {
                    if (err) res.status(500).send(err);
                    else {
                        workflow.supervisor = superv;
                        workflow.newSubs = data[0];
                        workflow.exSubs = data[1];
                        var orgL = superv.subordinates.length;
                        var exSub = workflow.exSubs.length;
                        if (data[0].length + data[1].length == 0) {
                            workflow.outcome.message = 'no new subordinate was assigned to ' + superv.fullName();
                            workflow.outcome.success = true;
                            return workflow.emit('response');
                        }
                        async.parallel([
                            function (cbx) {
                                workflow.emit('addNewSubs', workflow.newSubs, cbx);
                            }, function (cbx) {
                                workflow.emit('removeExSubs', workflow.exSubs, cbx);
                            }
                        ], function (er) {
                            if (!er) {
                                workflow.supervisor.save(function (e, r) {
                                    if (workflow.newSubs.length > 0) workflow.outcome.message = workflow.newSubs.length + ' new subordinate(s) successfully assigned to ' + superv.fullName(); else workflow.outcome.message = 'no new subordinate was assigned to ' + superv.fullName();
                                    workflow.outcome.success = true;
                                    workflow.emit('response');
                                });
                            } else {
                                workflow.outcome.errors.push('Could not assign some subordinates');
                                workflow.emit('response');
                            }
                        });
                    }
                });
            }
        });
    });
    workflow.on('removeNewSubFromPrev', function (sub, callback) {
        req.app.db.models.Employee.find({subordinates: sub.id}, function (err, superv) {
            superv = superv || [];
            if (superv.length == 0) return callback();
            async.each(superv, function (sup, cb) {
                var i = sup.subordinates.indexOf(sub.id);
                sup.subordinates.splice(i, 1);
                sup.save(function () {
                    cb();
                })
            }, function (e) {
                callback(e);
            });
        });
    });
    workflow.on('addNewSubs', function (subs, cbx) {
        async.each(subs, function (sub, cb) {
            sub.supervisor = workflow.supervisor.id || workflow.supervisor._id;
            sub.save(function (e) {
                if (e) cb(e); else {
                    (workflow.supervisor.subordinates || []).push(sub.id);
                    workflow.emit('removeNewSubFromPrev', sub, cb);
                }
            });
        }, function (err) {
            cbx(err);
        });
    });
    workflow.on('removeExSubs', function (subs, cbx) {
        async.each(subs, function (sub, cb) {
            sub.supervisor = undefined;
            sub.save(function (e) {
                if (e) cb(e); else {
                    var i = workflow.supervisor.subordinates.indexOf(sub.id);
                    if (i > -1) workflow.supervisor.subordinates.splice(i, 1);
                    cb();
                }
            })
        }, function (err) {
            cbx(err);
        });
    });
    workflow.emit('validate');
};

exports.getPerio = function (req, res) {
    req.app.kenna.utility.getCurrentPeriod(
        req.app.db.models.AppraisalPeriod,
        function (err, period) {
            if (err) res.status(404).send(err);
            else res.json(period);
        });
};


// Performance Benckmark
exports.performanceBenchmarkDash = function (req, res) {
    res.json([]);
};
// Performance Level Setup
exports.setupPerformanceLevel = function (req, res) {
    res.json([]);
};


exports.getScoringLevels = function (req, res) {
    req.app.db.models.SiteSetting.findOne({name: 'Performance Scoring'}, function (err, scrL) {
        if (err) res.status(500).send('Could not retrieve the values.');
        else if (scrL) res.json(scrL.value);
        else {
            var item = {
                name: 'Performance Scoring',
                description: 'Performance Level Indicator',
                value: req.app.kenna.defaultPlevels
            };
            req.app.db.models.SiteSetting.create(item, function (er, scr) {
                if (er) res.status(500).send('Could not retrieve the values from the datastore.');
                else res.json(scr.value);
            });
        }
    });
};
exports.getAppraisalLevels = function (req, res) {
    req.app.db.models.SiteSetting.findOne({name: 'Appraisal Level'}, function (err, scrL) {
        if (err) res.status(500).send('Could not retrieve the values.');
        else if (scrL) res.json(scrL.value);
        else {
            var item = {
                name: 'Appraisal Level',
                description: 'Appraisal Score',
                value: req.app.kenna.defaultAlevels
            }
            req.app.db.models.SiteSetting.create(item, function (er, scr) {
                if (er) res.status(500).send('Could not retrieve the values from the datastore.');
                else res.json(scr.value);
            });
        }
    });
};

exports.scoreAchievements = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);

    workflow.on('anErrorOccurred', function (msg) {
        workflow.outcome.errors.push(msg);
        return workflow.emit('response');
    });

    workflow.on('validate', function () {
        var employeeId = req.body.emp;
        var appraisals = req.body.scores;
        if (Array.is(appraisals)) {
            var hasEr = false
            appraisals.forEach(function (item) {
                ['kra', 'achievement', 'score', 'id']
                    .forEach(function (itm) {
                        if (!item[itm]) {
                            hasEr = true;
                        }
                    });
            });
            workflow.appraisals = appraisals;
            if (hasEr) return workflow.emit('anErrorOccurred', 'Please ensure that all required fields are entered.');
            else {
                workflow.appraisals.forEach(function (itm) {
                    workflow.emit('processSingle', itm);
                });
                //workflow.emit('getAppraisals');
            }
        }
        else return workflow.emit('anErrorOccurred', 'Data format is not correct.');
    });

    workflow.on('getAppraisals', function () {
        req.app.db.models.KraAppraisal.find({employeeId: workflow.employeeId, period: workflow.period.id})
            .populate('period kra')
            .exec(function (err, appr) {
                if (err) return workflow.emit('anErrorOccurred', 'Could not appraise employee at this time.');
                else if (appr.length > 0) {
                    if (workflow.appraisals.length != appr.length)
                        return workflow.emit('anErrorOccurred', 'The subitted appraisal is not complete. Please refresh the page.');
                    else
                        appr.forEach(function (itm) {
                            workflow.emit('processSingle', itm);
                        });
                }
                else return workflow.emit('anErrorOccurred', 'No appraisal found for employee.');
            });
    });
    workflow.on('processSingle', function (appraisal) {
        req.app.db.models.KraAppraisal.findById(appraisal._id || appraisal.id)
            .populate('period kra')
            .exec(function (err, appr) {
                if (err) return workflow.emit('anErrorOccurred', 'Could not appraise employee at this time.');
                else if (appr.length > 0) {
                    if (workflow.appraisals.length != appr.length)
                        return workflow.emit('anErrorOccurred', 'The subitted appraisal is not complete. Please refresh the page.');
                    else
                        appr.forEach(function (itm) {
                            workflow.emit('processSingle', itm);
                        });
                }
                else return workflow.emit('anErrorOccurred', 'No appraisal found for employee.');
            });
    });
    workflow.on('processSingle', function (appraisal) {

    });
    workflow.on('isAppraisalOpen', function () {
        req.app.kenna.utility.getCurrentPeriod(
            req.app.db.models.AppraisalPeriod,
            function (er, p) {
                if (er) {
                    workflow.outcome.errors.push(er);
                    return workflow.emit('response');
                }
                else {
                    workflow.period = p;
                    workflow.emit('validate');
                }
            });
    });
    workflow.emit('isAppraisalOpen');
};
exports.scoreAchievement = function (req, res) {
    res.status(500).send('Could not retrieve the data');
};


exports.addAchievementss = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var achievement = req.body;
        ['kra', 'achievement']
            .forEach(function (item) {
                if (!achievement[item]) workflow.outcome.errfor[item] = 'required';
            });
        workflow.achievement = achievement;
        if (workflow.hasErrors()) {
            workflow.outcome.errors.push('Please ensure that all required fields are entered.');
            return workflow.emit('response');
        }
        else workflow.emit('getKra');
    });
    workflow.on('getKra', function () {
        req.app.db.models.KRA.findById(workflow.achievement.kra, function (err, kra) {
            if (err) {
                return workflow.emit('exception', err);
            }
            else if (!kra) {
                workflow.outcome.errors.push('Selected KRA was not found.');
                return workflow.emit('response');
            } else {
                workflow.kra = kra;
                workflow.emit('getAppraisal');
            }
        });
    })
    workflow.on('getAppraisal', function () {
        req.app.db.models.KraAppraisal.findOne({employeeId: req.user.employee.employeeId, kra: workflow.kra.id})
            .exec(function (er, apr) {
                if (er) return workflow.emit('exception', er);
                else if (apr) {
                    if (apr.score || apr.scoreBy || apr.scoreDate) {
                        workflow.outcome.errors.push('Cannot add achievements for an already scored kra.');
                        return workflow.emit('response');
                    } else {
                        apr.achievement = workflow.achievement;
                        apr.save(function (er, appr) {
                            if (er) {
                                workflow.outcome.errors.push('Error occurred while modifying achievements.');
                                return workflow.emit('response');
                            } else {
                                workflow.outcome.item = appr;
                                workflow.outcome.success = true;
                                workflow.outcome.message = 'Achievements successfully modified';
                                workflow.emit('response');
                            }
                        });
                    }
                } else {
                    var kraAppraisal = {
                        employeeId: req.user.employee.employeeId,
                        name: req.user.employee.fullName(),
                        department: req.user.employee.department.name,
                        kra: workflow.kra.id,
                        period: workflow.period.id,
                        date: new Date(new Date().toDateString()),
                        achievement: workflow.achievement.achievement
                    };
                    req.app.db.models.KraAppraisal.create(kraAppraisal, function (er, apr) {
                        if (er) {
                            workflow.outcome.errors.push('Error occurred while adding achievements.');
                            return workflow.emit('response');
                        } else {
                            workflow.outcome.item = appr;
                            workflow.outcome.success = true;
                            workflow.outcome.message = 'Achievements successfully modified';
                            workflow.emit('response');
                        }
                    });
                }
            });
    });
    workflow.on('isAppraisalOpen', function () {
        req.app.kenna.utility.getCurrentPeriod(
            req.app.db.models.AppraisalPeriod,
            function (er, p) {
                if (er) {
                    workflow.outcome.errors.push(er);
                    return workflow.emit('response');
                }
                else {
                    workflow.period = p;
                    workflow.emit('validate');
                }
            });
    });
    workflow.emit('isAppraisalOpen');
};

//#region Supervisor Evaluation

//#endregion
//#endregion

exports.getSupervisorMapping = function (req, res) {
    var result = [];
    var async = require('async');
    async.parallel(
        [
            function (cb) {
                req.app.db.models.Employee.find('firstName lastName department')
                    .populate('subordinates', 'firstName lastName ')
                    .populate('department', 'name designations ')
                    .exec(function (err, r) {
                        if (err) cb(err);
                        else r.forEach(function (item) {
                            if (item.subordinates.length > 0) result.push(item);
                        });
                        cb();
                    });
            },
            function (cb) {
                req.app.db.models.Employee.find('firstName lastName department')
                    .populate('subordinates', 'firstName lastName ')
                    .populate('department', 'name designations ')
                    .exec(function (err, r) {
                        if (err) cb(err);
                        else r.forEach(function (item) {
                            if (item.subordinates.length > 0) result.push(item);
                        });
                        cb();
                    });
            }
        ], function (e) {
            if (e) res.status(500).send();
            else res.json(result);
        });
};

exports.getVersion = function (req, res) {
    res.json({version: req.app.appVersion, date: new Date(new Date().toDateString())});
};

