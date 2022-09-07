/**
 * Created by toluogunremi on 3/19/15.
 */

module.exports = function (app) {
    var employees = [
        { firstName: 'Alexander', lastName: 'Ogbenyi', designation: 'Admin Support Staff', department: 'Administration', access: 'R' },
        { firstName: 'Blessing', lastName: 'Ejukwa', designation: 'Admin Support Staff', department: 'Administration', access: 'R' },
        { firstName: 'Chiamaka', lastName: 'Okorie', designation: 'Admin Officer 3', department: 'Administration', access: 'Q' },
        { firstName: 'Deborah', lastName: 'Idakwo', designation: 'Facility Manager', department: 'Administration', access: 'R' },
        { firstName: 'Francisca', lastName: 'Sharta', designation: 'Admin Officer 1', department: 'Administration', access: 'Q' },
        { firstName: 'Gift', lastName: 'Olofin', designation: 'Facility Manager', department: 'Administration', access: 'Q' },
        { firstName: 'Shehu', lastName: 'Tajudeen', designation: 'Driver', department: 'Administration', access: 'R' },
        { firstName: 'Sunday', lastName: 'Aganyi', designation: 'Admin Support Staff', department: 'Administration', access: 'R' },
        { firstName: 'Abisola', lastName: 'Yusuf', designation: 'Associate', department: 'Counsel', access: 'R' },
        { firstName: 'Adeola', lastName: 'Adeniyi', designation: 'Associate', department: 'Counsel', access: 'Q' },
        { firstName: 'Adetola', lastName: 'Yousuph', designation: 'Associate Partner', department: 'Counsel', access: 'P' },
        { firstName: 'Ayokunle', lastName: 'Odekunle', designation: 'Associate', department: 'Counsel', access: 'Q' },
        { firstName: 'Bridget', lastName: 'Osazuwa', designation: 'Associate', department: 'Counsel', access: 'R' },
        { firstName: 'Charles', lastName: 'Nwabulu', designation: 'Senior Associate', department: 'Counsel', access: 'P' },
        { firstName: 'Chinemerem', lastName: 'Onuoma', designation: 'Senior Associate', department: 'Counsel', access: 'P' },
        { firstName: 'Douglas', lastName: 'Atebata', designation: 'Associate', department: 'Counsel', access: 'Q' },
        { firstName: 'Fabian', lastName: 'Ajogwu', designation: 'Principal Partner', department: 'Counsel', access: 'M' },
        { firstName: 'Gideon', lastName: 'Odionu', designation: 'Associate', department: 'Counsel', access: 'Q' },
        { firstName: 'Ituah', lastName: 'Imhanze', designation: 'Associate Partner', department: 'Counsel', access: 'N' },
        { firstName: 'Jessica', lastName: 'Ozoemena', designation: 'Associate', department: 'Counsel', access: 'Q' },
        { firstName: 'Jonathan', lastName: 'Makinde', designation: 'Associate', department: 'Counsel', access: 'R' },
        { firstName: 'Justina', lastName: 'Fakulude', designation: 'Senior Associate', department: 'Counsel', access: 'R' },
        { firstName: 'Matthew', lastName: 'Echo', designation: 'Senior Associate', department: 'Counsel', access: 'P' },
        { firstName: 'Moruf', lastName: 'Sowunmi', designation: 'Associate', department: 'Counsel', access: 'Q' },
        { firstName: 'Nimma', lastName: 'JoMadugu', designation: 'Associate', department: 'Counsel', access: 'R' },
        { firstName: 'Nnamdi', lastName: 'Ekwem', designation: 'Associate', department: 'Counsel', access: 'R' },
        { firstName: 'Nnanna', lastName: 'Oketa', designation: 'Associate', department: 'Counsel', access: 'Q' },
        { firstName: 'Odianosen', lastName: 'Erhonsele', designation: 'Associate', department: 'Counsel', access: 'Q' },
        { firstName: 'Olayomi', lastName: 'Olanrewaju', designation: 'Associate', department: 'Counsel', access: 'Q' },
        { firstName: 'Olubusola', lastName: 'Otedola-Olusanya', designation: 'Associate', department: 'Counsel', access: 'Q' },
        { firstName: 'Oludolapo', lastName: 'Makinde', designation: 'Associate', department: 'Counsel', access: 'Q' },
        { firstName: 'Olufunke', lastName: 'Cole', designation: 'Associate', department: 'Counsel', access: 'R' },
        { firstName: 'Onyekachi', lastName: 'Okafor', designation: 'Associate', department: 'Counsel', access: 'R' },
        { firstName: 'Oscar', lastName: 'Nliam', designation: 'Senior Associate', department: 'Counsel', access: 'P' },
        { firstName: 'Ositadinma', lastName: 'Nwosu', designation: 'Associate', department: 'Counsel', access: 'Q' },
        { firstName: 'Pam', lastName: 'Kim', designation: 'Associate', department: 'Counsel', access: 'Q' },
        { firstName: 'Sally', lastName: 'Onuorah', designation: 'Associate', department: 'Counsel', access: 'Q' },
        { firstName: 'Shamsiya', lastName: 'Sadiq-Mohammed', designation: 'Associate', department: 'Counsel', access: 'Q' },
        { firstName: 'Tosin', lastName: 'Kachikwu', designation: 'Associate', department: 'Counsel', access: 'Q' },
        { firstName: 'Uche', lastName: 'Udechukwu', designation: 'Associate', department: 'Counsel', access: 'Q' },
        { firstName: 'Uche', lastName: 'Anichebe', designation: 'Associate', department: 'Counsel', access: 'Q' },
        { firstName: 'Uzoamaka', lastName: 'Onugu', designation: 'Senior Associate', department: 'Counsel', access: 'P' },
        { firstName: 'Uzoezi', lastName: 'Umukoro', designation: 'Associate', department: 'Counsel', access: 'Q' },
        { firstName: 'Oladoyin', lastName: 'Anjorin', designation: 'Accounts Manager', department: 'Finance', access: 'Q' },
        { firstName: 'Oluwole', lastName: 'Adigun', designation: 'Head - Finance', department: 'Finance', access: 'P' },
        { firstName: 'Winifred', lastName: 'Chukwuemeka', designation: 'Finance Officer', department: 'Finance', access: 'R' },
        { firstName: 'Ananya', lastName: 'Kaul', designation: 'Head - HR, Practice Director', department: 'HR', access: 'O' },
        { firstName: 'Titilayo', lastName: 'Arogundade', designation: 'Admin Officer 2', department: 'HR', access: 'Q' },
        { firstName: 'Kofoworola', lastName: 'Adesanya', designation: 'IT Manager', department: 'Information Technology', access: 'P' }
    ];
    var migrated = [], errors = [], duplicates = [];
    var getUsername = function (model, whc) {
        return whc ?
        model.firstName.substring(0, 1).toLowerCase() + model.lastName.toLowerCase() :
        model.lastName.substring(0, 1).toLowerCase() + model.firstName.toLowerCase()
        ;
    };
    function createDepartments (){
        function createSingle(name) {
            app.db.models.Organisation.findOne(name, function (err, dept) {
                if (err) { console.log(err); }
                else if(!dept) {
                    app.db.models.Organisation.create({name:name, orgType:'Department'},
                        function (err, dept) {
                            if (err) { console.log(err); }//
                            else { console.log('department created'); }
                        });
                }
            });
        }
        var depts = [];
        employees.forEach(function(item){
            if(depts.indexOf(item.department) == -1){
                depts.push(item.department); createSingle(item.department);
            }
        });
        if(app.db.models.Employee.find(function(err,emps){
                if(err) console.log('data base error: ',err);
                if(emps.length == 0) createEmployees();
            }));
    };
    function createEmployees (){
        employees.forEach(function (item) {
            var user = {}, employee = item;
            function checkDuplicates() {
                function checkUsername() {
                    app.db.models.User.findOne({ username: getUsername(employee, true) }, function (err, user) {
                        if (err) {
                            //handle error
                        }
                        if (user) {
                            app.db.models.User.findOne({ username: getUsername(employee, false) }, function (err, user) {
                                if (err) {
                                    errors.push(item);
                                }
                                if (user) {
                                    duplicates.push(item);
                                } else {
                                    employee.employeeId = getUsername(item, false);
                                    checkEmail();
                                }
                            });
                        }
                        else {
                            employee.employeeId = getUsername(item, true);
                            checkEmail();
                        }
                    });
                };
                function checkEmail() {
                    employee.wEmail = employee.employeeId.toLowerCase() + '@kennapartners.com';
                    app.db.models.User.findOne({ email: employee.wEmail }, function (err, user) {
                        if (err) {
                            errors.push(item);
                        }
                        if (user) {
                            duplicates.push(item);
                        }
                        else createUser();
                    });
                };
                checkUsername();
            }
            function createUser() {
                function getHashedPassword() {
                    app.db.models.User.encryptPassword(employee.firstName.toLowerCase(), function(err,hash){
                        if(err){ /*  handle error */ }
                        else {
                            user.password = hash;
                            user.isActive = 'yes';
                            user.email = employee.wEmail;
                            user.username = employee.employeeId;
                            passwordHashed();
                        }
                    });
                };
                function passwordHashed() {
                    app.db.models.User.create(user, function (err, us) {
                        if (err) { /*  handle error */ }
                        else {
                            user = us;
                            checkDepartment();
                        }
                    });
                };
                getHashedPassword();
            }
            function checkDepartment() {
                app.db.models.Organisation.findOne({name: employee.department}, function (err, dept) {
                    if (err) { console.log(err); }//
                    else if(dept) {
                        employee.department = dept.id;
                        createEmployee();
                    }
                    else {
                        app.db.models.Organisation.create({name: employee.department, orgType:'Department'},
                            function (err, dept) {
                                if (err) { console.log(err); }//
                                else {
                                    employee.department = dept.id;
                                    createEmployee();
                                }
                            });
                    }
                });
            }
            function createEmployee() {
                app.db.models.Employee.create(employee, function (err, emp) {
                    if (err) { console.log(err); }//
                    else { employee = emp; employeeCreated(); }
                });
            }
            function employeeCreated() {
                if (employee) {
                    user.employee = employee.id;
                    user.save(function () {
                        migrated.push({ item: item, emp: employee, user: user });
                    });
                }
                else {
                    migrated.push({item: item, emp: employee, user: user});
                }
            }
            checkDuplicates();
        });
    };
    app.db.models.Employee.count(function(e,c){
        if(c == 0) createDepartments();
    });
};
