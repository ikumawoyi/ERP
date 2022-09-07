

exports.createEmployee = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);

    workflow.on('validate', function () {
        var employee = req.body;
        ['firstName', 'lastName', 'gender', 'dob', 'hired', 'pPhone', 'location']
            .forEach(function (item) {
                if (!employee[item]) workflow.outcome.errfor[item] = 'required';
            });
        if (workflow.hasErrors()) {
            workflow.outcome.errors.push('Please ensure that all required fields are entered.');
            return workflow.emit('response');
        }
        else { workflow.employee = employee; workflow.emit('checkDuplicates'); }
    });

    workflow.on('checkDuplicates', function () {
        workflow.on('checkUsername', function () {
            var ready = false;
            req.app.db.models.User.findOne({ username: req.app.kenna.utility.getUsername(workflow.employee, true) }, function (err, user) {
                if (err) {
                    return workflow.emit('exception', err);
                }
                if (user) {
                    req.app.db.models.User.findOne({ username: req.app.kenna.utility.getUsername(workflow.employee, false) }, function (err, user) {
                        if (err) {
                            return workflow.emit('exception', err);
                        }
                        if (user) {
                            workflow.outcome.errors.push('That username is already taken.');
                            return workflow.emit('response');
                        } else {
                            workflow.employee.username = req.app.kenna.utility.getUsername(workflow.employee, false);
                            workflow.emit('checkEmail');
                        }
                    });
                } else {
                    workflow.employee.employeeId = req.app.kenna.utility.getUsername(workflow.employee, true);
                    workflow.emit('checkEmail');
                }
            });
        });
        workflow.on('checkEmail', function () {
            workflow.employee.wEmail = workflow.employee.wEmail ? workflow.employee.wEmail.toLowerCase() : workflow.employee.employeeId.toLowerCase() + '@kennapartners.com';
            req.app.db.models.User.findOne({ email: workflow.employee.wEmail }, function (err, user) {
                if (err) {
                    return workflow.emit('exception', err);
                }

                if (user) {
                    workflow.outcome.errors.push('email already registered.');
                    return workflow.emit('response');
                } else workflow.emit('createUser');
            });
        });
        workflow.emit('checkUsername');
    });

    workflow.on('createUser', function () {
        workflow.on('getHashedPassword', function () {
            req.app.db.models.User.encryptPassword(workflow.employee.firstName.toLowerCase(), function (err, hash) {
                if (err) { workflow.emit('exception', err); }
                else {
                    workflow.employee.password = hash;
                    workflow.emit('passwordHashed');
                }
            });
        });
        workflow.on('passwordHashed', function () {
            var fieldsToSet = {
                isActive: 'yes',
                username: workflow.employee.employeeId,
                email: (workflow.employee.pEmail || workflow.employee.wEmail).toLowerCase(),
                password: workflow.employee.password
            };
            req.app.db.models.User.create(fieldsToSet, function (err, user) {
                if (err) { return workflow.emit('exception', err); }
                workflow.user = user;
                delete workflow.employee.password;
                workflow.outcome.user = { username: user.username, email: user.email }
                workflow.emit('createEmployee');
            });
        });
        workflow.emit('getHashedPassword');
    });

    workflow.on('createEmployee', function () {
        workflow.outcome.item = workflow.employee;
        workflow.employee.status = 'Active';
        req.app.db.models.Employee.create(workflow.employee, function (err, emp) {
            if (err) workflow.emit('reverseCreateUser', err);
            else { workflow.employee = emp; workflow.emit('employeeCreated'); }
        });
    });

    workflow.on('reverseCreateUser', function (er) {
        workflow.user.remove(function (err, t) {
            return workflow.emit('exception', er);
        });
    });

    //update user's employee field
    workflow.on('employeeCreated', function () {
        if (workflow.employee) {
            workflow.user.employee = workflow.employee.id;
            workflow.user.save(function () { workflow.emit('response'); });
        }
        else workflow.emit('response');
    });
    workflow.on('logInUser', function () {
        workflow.outcome.message = 'Employee Successfully created';
        workflow.outcome.success = true;
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
exports.updateEmployee = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    var task = 'emp';
    function canEdit(emp, cb) {
        if (employee.employeeId != req.user.username && !(req.user.employee.access == 'M' || req.user.employee.access == 'O' || (req.user.employee.tasks || []).indexOf(task) > -1));
    }
    workflow.on('validate', function () {
        var employee = req.body;
        if (employee.employeeId != req.user.username && !(req.user.employee.access == 'M' || req.user.employee.access == 'O' || (req.user.employee.tasks || []).indexOf(task) > -1))
            workflow.outcome.errors.push('You can only edit your own profile');
        ['firstName', 'lastName', 'gender', 'dob', 'hired', 'pPhone', 'location']
            .forEach(function (item) {
                if (!employee[item])
                    workflow.outcome.errfor[item] = 'required';
            });
        if (workflow.hasErrors()) {
            workflow.outcome.errors.push('Please ensure that all required fields are entered.');
            return workflow.emit('response');
        }
        else {
            workflow.employee = employee;
            return (req.user.employee.access == 'M' || req.user.employee.access == 'O' || (req.user.employee.tasks || []).indexOf(task) > -1) ? workflow.emit('updateAsPd') : workflow.emit('update');
        }
    });
    workflow.on('update', function () {
        var opts = "-employeeId -hired -role -department -access -confirmed -designation -experiences -educations -skills -dependants -leaveStatus -leaveLevel -tasks -location";
        req.app.db.models.Employee.findById(workflow.employee._id, opts, function (err, emp) {
            if (err) { return workflow.emit('exception', err); }
            else if (emp) {
                req.app.kenna.utility.populate(emp, workflow.employee, ['dob']);
                emp.save(function (er, data) {
                    if (er) return workflow.emit('exception', err);
                    else {
                        workflow.outcome.item = data; workflow.outcome.success = true;
                        workflow.outcome.message = 'Record successfully updated';
                        workflow.emit('response');
                    }
                });
            }
        });
    });
    workflow.on('updateAsPd', function () {
        var opts = "-employeeId -experiences -educations -skills -dependants -leaveStatus -leaveLevel -tasks";
        req.app.db.models.Employee.findById(workflow.employee._id, opts, function (err, emp) {
            if (err) { return workflow.emit('exception', err); }
            else if (emp) {
                var removeDetails = workflow.employee.status == 'Inactive' && emp.status != 'Inactive;';
                workflow.employee.status = workflow.employee.status || 'Active';
                workflow.employee.department = workflow.employee.department._id || workflow.employee.department.id;
                var include = ['dob']; if (workflow.employee.confirmed) include.push('confirmed'); if (!workflow.employee.status) include.push('status');
                req.app.kenna.utility.populate(emp, workflow.employee, include);
                emp.save(function (er, data) {
                    if (er) { return workflow.emit('exception', err); }
                    else {
                        workflow.outcome.item = data; workflow.outcome.success = true;
                        workflow.outcome.message = 'Record successfully updated';
                        if(removeDetails) workflow.emit('removeAllEmployeeRelations', emp.id, req.app);
                        workflow.emit('response');
                    }
                });
            }
        });
    });
    workflow.on('removeAllEmployeeRelations', function(id, app){
        app.db.models.Employee.find({subordinates: id}, function(e, sups){
            if(sups && sups.length){
                sups.forEach(function(sup){
                    var idx = sup.subordinates.indexOf(id.toString());
                    if(idx != 0){
                        sup.subordinates.splice(idx, 1);
                        sup.save();
                    }
                })
            }
        });
        app.db.models.Employee.find({superior: id}, function(e, subs){
            if(subs && subs.length){
                subs.forEach(function(sub){
                    if(sub.superior == id){
                        sub.superior = undefined;
                        sub.save();
                    }
                })
            }
        });
    });
    workflow.emit('validate');
};
exports.getActiveEmployees = function (req, res, next) {
    var q = req.app.db.models.Employee.find({ status: { $ne: 'Inactive' } }).populate('department');
    q.exec(function (err, results) {
        if (err) { return next(err); }
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send({ employees: results, byDepartment: require('underscore').groupBy(results, 'department') });
    });
};
exports.getActiveEmployeesForCard = function (req, res, next) {
    var q = req.app.db.models.Employee.find({ status: { $ne: 'Inactive' } })
        .populate('department')
        .populate('experiences')
        .populate('educations')
        .populate('skills')
        .populate('dependants')
        ;
    q.exec(function (err, results) {
        if (err) { return next(err); }
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send({ employees: results, byDepartment: require('underscore').groupBy(results, 'department') });
    });
};
exports.getExitedEmployees = function (req, res, next) {
    var q = req.app.db.models.Employee.find({ status: 'Inactive' }).populate('department');
    q.exec(function (err, results) {
        if (err) { return next(err); }
        res.send({ employees: results, byDepartment: require('underscore').groupBy(results, 'department') });
    });
};

//#region Profile Update
exports.editExperience = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var experience = req.body;
        ['employer', 'startDate', 'endDate']
            .forEach(function (item) {
                if (!experience[item])
                    workflow.outcome.errfor[item] = 'required';
            });
        ['startDate', 'endDate']
            .forEach(function (item) {
                if (experience[item] && false)
                    workflow.outcome.errfor[item] = 'invalid date';
            });
        if (workflow.hasErrors()) {
            workflow.outcome.errors.push('Please ensure that all required fields are entered.');
            return workflow.emit('response');
        }
        else {
            workflow.exp = experience;
            if (experience._id) {// update;
                workflow.emit('update');
            } else {//create
                workflow.emit('create');
            }
        }
    });
    workflow.on('update', function () {
        req.app.db.models.Experience.findById(workflow.exp._id, function (err, ex) {
            if (err) { return workflow.emit('exception', err); }
            else if (ex) {
                req.app.kenna.utility.populate(ex, workflow.exp);
                ex.save(function (er, data) {
                    if (er) return workflow.emit('exception', err);
                    else {
                        workflow.outcome.item = data; workflow.outcome.success = true;
                        workflow.outcome.message = 'Experience successfully updated';
                        workflow.emit('response');
                    }
                });
            }
            else {
                delete workflow.exp._id;
                workflow.emit('create');
            }
        });
    });
    workflow.on('create', function () {
        req.app.db.models.Experience.create(workflow.exp, function (err, exp) {
            if (err) { return workflow.emit('exception', err); }
            else if (exp) {
                workflow.outcome.item = exp;
                workflow.emit('updateEmployee');
            }
        });
    });
    workflow.on('updateEmployee', function () {
        req.app.db.models.Employee.findById(workflow.exp.employee)
            .populate('experiences').exec(function (err, emp) {
                if (err) { return workflow.emit('exception', err); }
                else if (emp) {
                    emp.experiences.push(workflow.outcome.item.id);
                    emp.save(function (er, data) {
                        if (er) return workflow.emit('exception', err);
                        else {
                            workflow.outcome.success = true;
                            workflow.outcome.message = 'Experience successfully added';
                            workflow.emit('response');
                        }
                    });
                }
                else {
                    workflow.outcome.errors.push('Employee record not found.');
                    workflow.emit('response');
                }
            });
    });

    workflow.emit('validate');
};
exports.editEducation = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var education = req.body;
        ['school', 'major', 'grade', 'startDate', 'endDate']
            .forEach(function (item) {
                if (!education[item])
                    workflow.outcome.errfor[item] = 'required';
            });
        ['startDate', 'endDate', 'dateAwarded']
            .forEach(function (item) {
                if (education[item] && false)
                    workflow.outcome.errfor[item] = 'invalid date';
            });
        ['qualification']
            .forEach(function (item) {
                if (education[item] && req.app.constants.qualifications.indexOf(education[item]) == -1)
                    workflow.outcome.errfor[item] = 'invalid qualification';
            });
        if (workflow.hasErrors()) {
            workflow.outcome.errors.push('Please ensure that all required fields are entered.');
            return workflow.emit('response');
        }
        else {
            workflow.edu = education;
            if (education._id) {// update;
                workflow.emit('update');
            } else {//create
                workflow.emit('create');
            }
        }
    });
    workflow.on('update', function () {
        req.app.db.models.Education.findById(workflow.edu._id, function (err, ed) {
            if (err) { return workflow.emit('exception', err); }
            else if (ed) {
                req.app.kenna.utility.populate(ed, workflow.edu);
                ed.save(function (er, data) {
                    if (er) return workflow.emit('exception', err);
                    else {
                        workflow.outcome.item = data; workflow.outcome.success = true;
                        workflow.outcome.message = 'Education successfully updated';
                        workflow.emit('response');
                    }
                });
            }
            else {
                delete workflow.exp._id;
                workflow.emit('create');
            }
        });
    });
    workflow.on('create', function () {
        req.app.db.models.Education.create(workflow.edu, function (err, edu) {
            if (err) { return workflow.emit('exception', err); }
            else if (edu) {
                workflow.outcome.item = edu;
                workflow.emit('updateEmployee');
            }
        });
    });

    workflow.on('updateEmployee', function () {
        req.app.db.models.Employee.findById(workflow.edu.employee)
            .populate('educations').exec(function (err, emp) {
                if (err) { return workflow.emit('exception', err); }
                else if (emp) {
                    emp.educations.push(workflow.outcome.item.id);
                    emp.save(function (er, data) {
                        if (er) return workflow.emit('exception', err);
                        else {
                            workflow.outcome.success = true;
                            workflow.outcome.message = 'Education successfully added';
                            workflow.emit('response');
                        }
                    });
                }
                else {
                    workflow.outcome.errors.push('Employee record not found.');
                    workflow.emit('response');
                }
            });
    });
    workflow.emit('validate');
};
exports.editSkill = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var skill = req.body;
        ['name', 'date', 'level']
            .forEach(function (item) {
                if (!skill[item])
                    workflow.outcome.errfor[item] = 'required';
            });
        ['date']
            .forEach(function (item) {
                if (skill[item] && false)
                    workflow.outcome.errfor[item] = 'invalid date';
            });
        ['skill']
            .forEach(function (item) {
                if (skill[item] && req.app.constants.skills.indexOf(education[item]) == -1)
                    workflow.outcome.errfor[item] = 'skill level no recognized';
            });
        if (workflow.hasErrors()) {
            workflow.outcome.errors.push('Please ensure that all required fields are entered.');
            return workflow.emit('response');
        }
        else {
            workflow.ski = skill;
            if (skill._id) {// update;
                workflow.emit('update');
            } else {//create
                workflow.emit('create');
            }
        }
    });
    workflow.on('update', function () {
        req.app.db.models.Skill.findById(workflow.ski._id, function (err, sk) {
            if (err) { return workflow.emit('exception', err); }
            else if (sk) {
                req.app.kenna.utility.populate(sk, workflow.ski);
                sk.save(function (er, data) {
                    if (er) return workflow.emit('exception', err);
                    else {
                        workflow.outcome.item = data; workflow.outcome.success = true;
                        workflow.outcome.message = 'Skill successfully updated';
                        workflow.emit('response');
                    }
                });
            }
            else {
                delete workflow.ski._id;
                workflow.emit('create');
            }
        });
    });
    workflow.on('create', function () {
        req.app.db.models.Skill.create(workflow.ski, function (err, ski) {
            if (err) { return workflow.emit('exception', err); }
            else if (ski) {
                workflow.outcome.item = ski;
                workflow.emit('updateEmployee');
            }
        });
    });

    workflow.on('updateEmployee', function () {
        req.app.db.models.Employee.findById(workflow.ski.employee)
            .populate('skills').exec(function (err, emp) {
                if (err) { return workflow.emit('exception', err); }
                else if (emp) {
                    emp.skills.push(workflow.outcome.item.id);
                    emp.save(function (er, data) {
                        if (er) return workflow.emit('exception', err);
                        else {
                            workflow.outcome.success = true;
                            workflow.outcome.message = 'Skill successfully added';
                            workflow.emit('response');
                        }
                    });
                }
                else {
                    workflow.outcome.errors.push('Employee record not found.');
                    workflow.emit('response');
                }
            });
    });
    workflow.emit('validate');
};
exports.editDependant = function (req, res) {
    var workflow = req.app.utility.workflow(req, res);
    workflow.on('validate', function () {
        var dependant = req.body;
        ['firstName', 'lastName']
            .forEach(function (item) {
                if (!dependant[item])
                    workflow.outcome.errfor[item] = 'required';
            });
        ['effectiveDate', 'EndDate', 'dob']
            .forEach(function (item) {
                if (dependant[item] && false)
                    workflow.outcome.errfor[item] = 'invalid date';
            });
        ['gender']
            .forEach(function (item) {
                if (dependant[item] && req.app.constants.gender.indexOf(dependant[item]) == -1)
                    workflow.outcome.errfor[item] = 'skill level no recognized';
            });
        if (workflow.hasErrors()) {
            workflow.outcome.errors.push('Please ensure that all required fields are entered.');
            return workflow.emit('response');
        }
        else {
            workflow.dep = dependant;
            if (dependant._id) {// update;
                workflow.emit('update');
            } else {//create
                workflow.emit('create');
            }
        }
    });
    workflow.on('update', function () {
        req.app.db.models.Dependant.findById(workflow.dep._id, function (err, dp) {
            if (err) { return workflow.emit('exception', err); }
            else if (dp) {
                req.app.kenna.utility.populate(dp, workflow.dep);
                dp.save(function (er, data) {
                    if (er) return workflow.emit('exception', err);
                    else {
                        workflow.outcome.item = data; workflow.outcome.success = true;
                        workflow.outcome.message = 'Dependant successfully updated';
                        workflow.emit('response');
                    }
                });
            }
            else {
                delete workflow.dep._id;
                workflow.emit('create');
            }
        });
    });
    workflow.on('create', function () {
        req.app.db.models.Dependant.create(workflow.dep, function (err, dep) {
            if (err) { return workflow.emit('exception', err); }
            else if (dep) {
                workflow.outcome.item = dep;
                workflow.emit('updateEmployee');
            }
        });
    });
    workflow.on('updateEmployee', function () {
        req.app.db.models.Employee.findById(workflow.dep.employee)
            .populate('dependants').exec(function (err, emp) {
                if (err) { return workflow.emit('exception', err); }
                else if (emp) {
                    emp.dependants.push(workflow.outcome.item.id);
                    emp.save(function (er, data) {
                        if (er) return workflow.emit('exception', err);
                        else {
                            workflow.outcome.success = true;
                            workflow.outcome.message = 'Dependant successfully updated';
                            workflow.emit('response');
                        }
                    });
                }
                else {
                    workflow.outcome.errors.push('Employee record not found.');
                    workflow.emit('response');
                }
            });
    });
    workflow.emit('validate');
};
exports.changePicture = function (req, res) {
    var fs = require('fs');
    var file = (req.files || {}).file;
    if (file && file.path) {
        var filePath = file.path;
        var dest = 'public/img/' + req.user.username + '.jpg';
        fs.unlink(dest, function (err) {
            if (!err || err.errno.toString() == '-4058')
                fs.rename(filePath, dest, function (e) {
                    res.json({ success: !e, message: !e ? 'Successfully updated picture' : 'Could not complete request.' });
                });
            else
                fs.unlink(filePath, function (err) {
                    res.json({ success: false, message: "An error occured while uploading file." })
                });
        });
    } else res.json({ success: false, message: "No file was uploaded." })
};

//#endregion
