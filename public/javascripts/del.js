/**
 * Created by Ubiri Uzoezi on 04/05/2015.
 */
var $scope = {}, exports = {};
$scope.checkedChanged = function (desig) {
    if ($scope.modified.chosen[desig] && $scope.modified.designations.indexOf(desig) == -1)
        $scope.modified.designations.push(desig);
    else if (!$scope.modified.chosen[desig]) {
        var i = $scope.modified.designations.indexOf(desig);
        if (i >= 0) $scope.modified.designations.splice(i, 1);
    }
};

$scope.resetDesigs = function () {
    globals.constants.designations.forEach(function (item) {
        $scope.modified.chosen[item] = false;
    })
};
$scope.checkedChanged = function (desig) {
    if ($scope.kraEdit.chosen[desig] && $scope.kraEdit.designations.indexOf(desig) == -1)
        $scope.kraEdit.designations.push(desig);
    else if (!$scope.kraEdit.chosen[desig]) {
        var i = $scope.kraEdit.designations.indexOf(desig);
        if (i >= 0) $scope.kraEdit.designations.splice(i, 1);
    }
};
$scope.checkedRChanged = function (desig) {
    if ($scope.kraEdit.removed[desig]) {
        var i = $scope.kraEdit.designations.indexOf(desig);
        if (i >= 0) $scope.kraEdit.designations.splice(i, 1);
    }
    else if (!$scope.kraEdit.removed[desig] && $scope.kraEdit.designations.indexOf(desig) == -1) {
        $scope.kraEdit.designations.push(desig);
    }
};
//globals.constants.designations.forEach(function (itm) {
//    if (item.designations.indexOf(itm) == -1) {
//        $scope.included.push(itm);
//        $scope.kraEdit.chosen[itm] = false;
//    }
//    else {
//        $scope.excluded.push(itm);
//        $scope.kraEdit.removed[itm] = false;
//    }
//});
//$scope.getKraAs = function () {
//    $http.get('/employee/kraareas2')
//        .success(function (r) {
//            globals.allKraAreas = r;
//            $scope.areas = [];;
//            for(var a in r){
//                var area = JSON.parse(a);
//                area.kras = r[a];
//                $scope.areas.push(area);
//            }
//            //$scope.resetDesigs();
//            //$scope.modified.area = r[0];
//            //$scope.modified.department =
//        });
//};


exports.getKraAsAdMin2 = function(req,res){
    var workflow = req.app.utility.workflow(req,res);
    workflow.on('getData', function(){
        //req.app.db.models.KraArea.find()
        //    .populate('kras')
        //    .exec(function (err, kras) {
        //        if (err)  res.json([]);
        //        else res.json(kras);
        //    });
        req.app.db.models.KRA.find()
            .populate('department', 'name designations')
            .populate('area', 'name')
            .exec(function (err, kras) {
                if (err) res.json([]);
                else{
                    res.json(require('underscore').groupBy(kras, function(o){
                        return o.area.name;
                    }));
                }
            });

        req.app.db.models.KraArea.find()
            .populate('kras')
            .exec(function (err, kras) {
                if (err)  res.json([]);
                else{
                    req.app.db.models.KRA.populate(kras.kras, 'department',function() {
                        res.json(kras);
                    });
                }
            });
    });
    workflow.emit('getData');
};
function updateComp(item){
    delete item.questions;
    req.app.db.models.PerformanceCompetenceCategory.findByIdAndUpdate(item._id, item, function (err, exp) {
        if (err) { workflow.outcome.errors.push('An error occurred while updating the record.');return workflow.emit('exception', err); }
        else if(exp) {
            workflow.outcome.item = exp;
            console.log(exp);
            workflow.outcome.success = true;
            workflow.outcome.message = 'Performance competence category successfully updated';
            workflow.emit('response');
            //kenna.utility.populate(exp, item, ['filter']); exp.filter = item.filter;
            //console.log(exp.toObject());
            //exp.save(function(er,itm){
            //    if (err) { workflow.outcome.errors.push('An error occurred while updating the record.');return workflow.emit('exception', err); }
            //    else {
            //        workflow.outcome.item = exp;
            //        console.log(itm);
            //        workflow.outcome.success = true;
            //        workflow.outcome.message = 'Performance competence category successfully updated';
            //        workflow.emit('response');
            //    }
            //})
        }else{
            workflow.outcome.errors.push('Record was not found.');return workflow.emit('exception', err);
        }
    });
};

exports.addAchievements = function (req, res) {
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
            if (err) { return workflow.emit('exception', err); }
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
        req.app.db.models.KraAppraisal.findOne({ employeeId: req.user.employee.employeeId, kra: workflow.kra.id })
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
        kenna.utility.getCurrentPeriod(
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
/**
 * Created by toluogunremi on 3/13/15.
 */
//var module = angular.module('system.user', ['ui.bootstrap', 'dialogs.main', 'chieffancypants.loadingBar', 'ngAnimate']);
//module.factory('Messages', function ($timeout) {
//    var s = {};
//    s.messages = []; s.modalMessages = [];
//    s.showMessage = function (msg, level) {
//        s.messages.push({ text: msg, type: level });
//        $timeout(function () { s.closeMessage(0); }, 15000);
//    };
//    s.showModalMessage = function (msg, level) {
//        s.modalMessages.push({ text: msg, type: level });
//        $timeout(function () { s.closeModalMessage(0); }, 15000);
//    };
//    s.closeMessage = function (index) {
//        s.messages.splice(index, 1);
//    };
//    s.closeModalMessage = function (index) {
//        s.modalMessages.splice(index, 1);
//    };
//    s.processResult = function (result, pop) {
//        s.messages.length = 0;
//        if (result.Success) {
//            if (isEmpty(result.Messages))  s.showMessage('Operation succeeded', 'success');
//        }
//        else if (isEmpty(result.Messages))
//            s.showMessage('Operation failed', 'warning');
//        angular.forEach(result.Messages, function (value, key) {
//            var v = 'muted';
//            switch (value) {
//                case 0: v = 'muted'; break;
//                case 1: v = 'primary'; break;
//                case 2: v = 'success'; break;
//                case 3: v = 'info'; break;
//                case 4: v = 'warning'; break;
//                case 5: v = 'danger'; break;
//            }
//            s.showMessage(key, v);
//            //if(pop)
//            //    alert(key);
//        });
//    };
//    return s;
//});
//module.factory('User', function ($http) {
//    var service = {};
//    service.info = null;
//    service.afterLogin = null;
//    service.getUser = function () {
//        $http.get('user').
//            success(function (user) {
//                if (user && user.username) {
//                    service.info = user;
//                    if (service.modal) {
//                        service.modal.close(service.info);
//                        if (service.afterLogin)
//                            service.afterLogin();
//                    }
//                }
//                else
//                    service.info = null;
//            });
//    }
//    service.ensureLogin = function (callback) {
//        if (service.info) {
//            if (callback)
//                callback();
//        }
//        else {
//            $http.get('user').
//                success(function (user) {
//                    if (user && user.username) {
//                        if (callback)
//                            callback();
//                    }
//                    else {
//                        service.afterLogin = callback;
//                        service.ctrl.login();
//                    }
//                });
//        }
//    };
//    return service;
//});
//module.filter('encode', function () {
//    return function (input) {
//        if (input) {
//            return input.replace(' ', '');
//        }
//    };
//});
//module.controller('msgCtrl',
//    function ($scope, Messages) {
//        $scope.alerts = Messages.messages;
//        $scope.closeAlert = Messages.closeMessage;

//        $scope.modalAlerts = Messages.modalMessages;
//        $scope.closeModalAlert = Messages.closeModalMessage;
//    });
//module.controller('userCtrl',
//    function ($scope, $http, $location, dialogs, Messages, User, authService, $window) {
//        $scope.now = new Date();
//        User.ctrl = $scope;
//        $scope.user = User;
//        $scope.login = function () {
//            dialogs.create('pages/login.html', 'loginCtrl', {}, {}).
//                result.then(function (obj) {
//                    if (obj && obj.FirstName) {
//                        authService.loginConfirmed();
//                    }
//                    else if (obj && obj.forgot)
//                        $scope.forgot();
//                    else if (obj && obj.register)
//                        $scope.register();
//                });
//        };
//        $scope.$on('user', function (data) {
//            $scope.user = data;
//        });
//        $scope.register = function () {
//            dialogs.create('pages/register.html', 'regCtrl', {}, { size: 'md' });
//        };
//        $scope.forgot = function () {
//            dialogs.create('pages/forgot.html', 'forgotCtrl', {}, { size: 'md' });
//        };
//        $scope.refresh = function () {
//            User.getUser();
//        };
//        $scope.password = function () {
//            dialogs.create('pages/password.html', 'pwdCtrl', {}, { size: 'md' });
//        };
//        $scope.profile = function () {
//            dialogs.create('pages/profile.html', 'profileCtrl', {}, { size: 'md' });
//        };
//        $scope.logout = function () {
//            $http.get('/logout').then(function () { $window.location.href = '/'; });
//        };
//        $scope.$on('event:auth-loginRequired', function (event, data) {
//            $scope.login();
//        });
//        $scope.mycards = function () {
//            $location.url("/cards");
//        };
//    });
//module.controller('loginCtrl',
//    function ($scope, $http, Messages, User, $window) {
//        $scope.user = null;
//        $scope.login = function () {
//            if (('grecaptcha' in window && form['g-recaptcha-response'] && form['g-recaptcha-response'].value) || !('grecaptcha' in window)) {
//                $scope.user['g-recaptcha-response'] = !('grecaptcha' in window) ? 'tt' : form['g-recaptcha-response'].value;
//                $http.post('/login', $scope.user).
//                    success(function (result) {
//                        if (result.success) {
//                            $window.location.href = $window.location.href
//                            if (User.afterLogin) User.afterLogin();
//                        }
//                        else {
//                            if (result.errors.length > 0) {
//                                result.errors.forEach(function (item) {
//                                    Messages.showMessage(item, 'danger');
//                                });
//                            }
//                            grecaptcha.reset();
//                        }
//                    }).
//                    error(function (data, status) {
//                        alert('Error: ' + status);
//                    });
//            }
//            else if ('grecaptcha' in window) {
//                Messages.showMessage('Please response to the captcha', 'danger');
//            }
//            else {
//                Messages.showMessage('Please wait while recaptcha loads', 'danger');
//            }
//        };
//        $scope.cancel = function () {
//        };
//        $scope.forgot = function () {
//        };
//        $scope.register = function () {

//        };
//    });
//module.controller('regCtrl',
//    function ($scope, $http, $modalInstance, $filter, Messages, User, datepickerConfig) {
//        $scope.user = {};
//        $scope.card = {};
//        $scope.card.Country = 'Nigeria';
//        $scope.cardTypes = ['Visa', 'MasterCard'];
//        $scope.bdateMax = $filter('date')(Date(), 'dd MMM yyyy');
//        $scope.bdateOpen = function ($event) {
//            $event.preventDefault();
//            $event.stopPropagation();
//            $scope.opened = {
//                value: true
//            };
//        };
//        $scope.umtChanged = function () {
//            var date = new Date();
//            if ($scope.user.UMT) {
//                var min = new Date();
//                min.setFullYear(date.getFullYear() - 80);
//                var max = new Date();
//                max.setFullYear(date.getFullYear() - 20);
//                $scope.bdateMax = $filter('date')(max, 'dd MMM yyyy');
//                $scope.bdateMin = $filter('date')(min, 'dd MMM yyyy');
//            }
//            else {
//                $scope.bdateMax = $filter('date')(Date(), 'dd MMM yyyy');
//                $scope.bdateMin = null;
//            }
//        };
//        $scope.cancel = function () {
//            $modalInstance.dismiss('cancel');
//            datepickerConfig.datepickerMode = 'day';
//        };
//        $scope.register = function () {
//            $scope.user.Email = $scope.user.UserName;
//            if ($scope.user.MoneyTransfer) {
//                $scope.user.Cards = [];
//                $scope.user.Cards.push($scope.card);
//                $scope.card.UserName = $scope.user.UserName;
//            }
//            $http.post('register', $scope.user).
//                success(function (result) {
//                    Messages.processResult(result);
//                    if (result.Success) {
//                        $modalInstance.close();
//                        datepickerConfig.datepickerMode = 'day';
//                    }
//                }).
//                error(function (data, status) {
//                    alert('Error: ' + status);
//                });
//        };
//        datepickerConfig.datepickerMode = 'year';
//    });
//module.controller('forgotCtrl',
//    function ($scope, $http, $modalInstance, Messages) {
//        $scope.user = {};
//        $scope.ready = false;
//        $scope.cancel = function () {
//            $modalInstance.dismiss('cancel');
//        };
//        $scope.send = function () {
//            $http.post('reset', $scope.user).
//                success(function (result) {
//                    Messages.processResult(result, true);
//                    $scope.ready = true;
//                }).
//                error(function (data, status) {
//                    alert('Error: ' + status);
//                });
//        };
//        $scope.beready = function () {
//            $scope.ready = true;
//        };
//        $scope.save = function () {
//            $http.post('resetpassword', $scope.user).
//                success(function (result) {
//                    Messages.processResult(result, true);
//                    if (result.Success)
//                        $modalInstance.close();
//                }).
//                error(function (data, status) {
//                    alert('Error: ' + status);
//                });
//        };
//    });
//module.controller('pwdCtrl',
//    function ($scope, $http, $modalInstance, Messages) {
//        $scope.user = {};
//        $scope.cancel = function () {
//            $modalInstance.dismiss('cancel');
//        };
//        $scope.save = function () {
//            $http.put('account/password', $scope.user).success(function (result) {
//                if (result.message) Messages.showMessage(result.message, 'success');
//                if (result.success) $modalInstance.close();
//            }).error(function (data, status) {
//                Messages.showMessage('Error: ' + status, 'danger');
//            });
//        };
//    });