/// <reference path="../lib/angular.js" />
var app = angular.module('app');
app.controller('mainCtrl', ['globals',
    function (globals) {
        globals.getConstants();
        globals.getUser();
        globals.getInvitations();
        globals.getMessages();
    }
]);
app.controller('caseCtrl', ['$scope', '$http', 'Messages', 'globals', '$location',function ($scope, $http, Messages, globals, $location) {
    $scope = $scope || {};
    var path = $location.path();
    if (path == '/mycases') {
        $scope.getCases = function () {
            $http.get($scope.dataPath.myCases)
                .success(function (r) {
                    if (r.message) Messages.showMessage(r.message, 'success');
                    $scope.cases = r;
                })
                .error(function (e, p) {
                    if (angular.isString(e)) { Messages.showMessage(e); }
                    else if (angular.isString((e || {}).msg)) { Messages.showMessage(e); }
                })
        };
        $scope.getCases();
    } else if (path == '/casereports') {
        $scope.getCases = function () {
            $http.get($scope.dataPath.caseReport)
                .success(function (r) {
                    if (r.message) Messages.showMessage(r.message, 'success');
                    $scope.reports = r;
                })
                .error(function (e, p) {
                    if (angular.isString(e)) { Messages.showMessage(e); }
                    else if (angular.isString((e || {}).msg)) { Messages.showMessage(e); }
                })
        };
        $scope.getCases();
        $scope.closeCase = function(c){
            $http.post('/case/close/'+c._id, c)
                .success(function(r){
                    if(r.success)
                        c.closed = true;
                    if(r.message) Messages.showMessage(r.message, r.success ? 'success' : 'danger');
                })
                .error(function(e,p){

                })
        }
    } else if (path == '/closedcases') {
        $scope.getCases = function () {
            $http.get($scope.dataPath.closedCaseReport)
                .success(function (r) {
                    if (r.message) Messages.showMessage(r.message, 'success');
                    $scope.reports = r;
                })
                .error(function (e, p) {
                    if (angular.isString(e)) { Messages.showMessage(e); }
                    else if (angular.isString((e || {}).msg)) { Messages.showMessage(e); }
                })
        };
        $scope.getCases();
        $scope.closeCase = function(c){
            $http.post('/case/close/'+c._id, c)
                .success(function(r){
                    if(r.success)
                        c.closed = true;
                    if(r.message) Messages.showMessage(r.message, r.success ? 'success' : 'danger');
                })
                .error(function(e,p){

                })
        }
    } else if (path == '/definecase') {
        $scope.state = { sup: 0, sub: 0, inc: [] };
        $scope.refresh = function () {

        };
        $scope.getiData = function () {
            $scope.formError = true;
            $http.get($scope.dataPath.icases)
                .success(function (r) {
                    if (r.message) Messages.showMessage(r.message, 'success');
                    $scope.iData = r; $scope.newCase = r.open || { title: 'New Case Title' }; if (r.open._id) { $scope.state.inc = r.open.members; $scope.state.sub = r.open.stat.sub; $scope.state.sup = r.open.stat.sup; }
                })
                .error(function (e, p) {
                    if (angular.isString(e)) { Messages.showMessage(e); }
                    else if (angular.isString((e || {}).msg)) { Messages.showMessage(e); }
                })
        };
        $scope.saveCaseData = function (newCase, al) {
            if (!$scope.entryIsValid())
                return Messages.showModalMessage('The entry is not valid');
            newCase.members = $scope.state.inc.slice(0, $scope.state.inc.length); newCase.stat = { sup: $scope.state.sup, sub: $scope.state.sub };
            $http.post($scope.dataPath.icases, newCase)
                .success(function (r) {
                    if (r.message) Messages.showModalMessage(r.message, r.success ? 'success' : 'danger');
                    if (r.success) {
                        delete $scope.iDate; $scope.state.sub = $scope.state.sup = 0; $scope.state.inc.splice(0, $scope.state.inc.length); newCase = {};
                        $scope.getiData();
                    }
                    else {
                        if ((r.errors || []).length > 0)
                            r.errors.forEach(function (item) { Messages.showModalMessage(item, 'danger'); });
                        if (r.errfor) {
                            var msg = '';
                            for (var p in r.errfor) msg += p + ':' + r.errfor[p] + ' ';
                            if (msg != '') Messages.showModalMessage(msg, 'danger');
                        }
                    }
                })
                .error(function (e, p) {
                    if (angular.isString(e)) { Messages.showModalMessage(e); }
                    else if (angular.isString((e || {}).msg)) { Messages.showModalMessage(e); }
                })
        };
        $scope.toggleSelection = function (id, key, d, l) {
            if (!($scope.newCase.location && $scope.newCase.title)) {
                d.preventDefault();
                $scope.formError = true;
                return Messages.showModalMessage('The Title/Location are required.');
            }
            var idx = $scope.state.inc.indexOf(id);
            var dis = $scope.iData.sub.indexOf(key) > -1 ? 'sub' : 'sup';
            if (idx > -1) {
                $scope.state.inc.splice(idx, 1);
                --$scope.state[dis];
                $scope.formError = !$scope.entryIsValid();
            } else {
                if ($scope.state.inc.length >= 3) {
                    d.preventDefault();
                    return Messages.showModalMessage('A maximum of 3 team members can be included.');
                }
                if (dis == 'sup') {
                    if ($scope.state[dis] == 0 && l == $scope.newCase.location) {
                        $scope.state.inc.push(id);
                        $scope.state[dis] = 1;
                        $scope.formError = !$scope.entryIsValid();
                    } else {
                        d.preventDefault();
                        Messages.showModalMessage($scope.state[dis] == 0 ? 'Only a senior counsel in ' + $scope.newCase.location + ' can be chosen' : 'Only one senior counsel can be chosen');
                    }
                } else {
                    if ($scope.newCase.location == 'Abuja' && $scope.employee.location != 'Abuja' && $scope.state[dis] >= 1) {
                        d.preventDefault();
                        Messages.showMessage('Only one associate from lagos can be selected.' + ($scope.state[dis] > 1 ? ' Please unselect others.' : ''));
                    } else {
                        $scope.state.inc.push(id);
                        ++$scope.state[dis];
                        $scope.formError = !$scope.entryIsValid();
                    }
                }
            }
        };
        $scope.entryIsValid = function () {
            if (!($scope.newCase.title && $scope.newCase.location)) return false;
            if ($scope.newCase._id) {
                if ($scope.state.inc.length == 3 && $scope.state.sub >= 2 && $scope.state.sup <= 1) return true;
                return false;
            } else {
                if ($scope.newCase.location == 'Abuja') {
                    if ($scope.state.sub == 1 && $scope.state.sup == 1) return true;
                    if ($scope.state.sub > 1) return false;
                    return false;
                } else {
                    if ($scope.state.inc.length == 3) return true;
                    if ($scope.state.inc.length != 3 && $scope.state.sub == $scope.iData.c) return true;
                    return false;
                }
            }
        }
        $scope.lChanged = function (e, l) {
            if ($scope.newCase._id) {
                Messages.showMessage('Location cannot be changed');
                $scope.newCase.location = $scope.iData.open.location;
            }
            if ($scope.newCase.location == 'Abuja' && $scope.state.sub > 1) { Messages.showMessage('Only one associate from lagos can be selected. Please unselect others.'); $scope.formError = true; }
        }
        $scope.getiData();
    }
}]);
app.controller('pwdCtrl', function ($scope, $http, $modalInstance, Messages) {
    $scope.user = {};
    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
    $scope.save = function () {
        $http.put('account/password', $scope.user).success(function (result) {
            if (result.message) Messages.showMessage(result.message, 'success');
            if (result.success) $modalInstance.close();
        }).error(function (data, status) {
            Messages.showMessage('Error: ' + status, 'danger');
        });
    };
});
app.controller('userCtrl', function ($scope, $http, dialogs, $location, Messages, $window) {
    $scope.now = new Date();
    $scope.$on('user', function (data) {
        $scope.user = data;
    });
    $scope.profile = function () {
        dialogs.create('pages/profile.html', 'profileCtrl', {}, { size: 'md' });
    };
    $scope.password = function () {
        dialogs.create('pages/password.html', 'pwdCtrl', {}, { size: 'md' });
    };
    $scope.logout = function () {
        $http.get('/logout').then(function () { $window.location.href = '/'; });
    };
    $scope.login = function () {
        if(!window.loginModal)
        dialogs.create('pages/login.html', 'loginCtrl', {}, {size:'md', keyboard: false, backdrop: 'static'});
    };
    $scope.$on('event:auth-loginRequired', function (event, data) {
        //$scope.login();
    });
});
app.controller('apiTestCtrl', function ($scope, $http) {
    $scope.g = function () {
        $http.get('/test')
            .success(function (r) {
                $scope.results = r;
            })
            .error(function (r) {
            });
    }
    $scope.uploadFile = function (files) {
        var fd = new FormData();
        //Take the first selected file
        fd.append("file", files[0]);

        $http.post(uploadUrl, fd, {
            withCredentials: true,
            headers: { 'Content-Type': undefined },
            transformRequest: angular.identity
        }).success().error();

    };
});
app.controller('infoCtrl', function ($scope, $timeout, $window, FileUploader, Messages) {
    const path = 'img/' + ($scope.employee || {}).employeeId + '.jpg';
    $scope.imageURL = path;

    $scope.uploader = new FileUploader({
        url: 'employee/picture'
    });

    // Set file uploader image filter
    $scope.uploader.filters.push({
        name: 'imageFilter',
        fn: function (item, options) {
            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
            return '|jpg|png|jpeg|bmp|'.indexOf(type) !== -1;
        }
    });

    // Called after the user selected a new picture file
    $scope.uploader.onAfterAddingFile = function (fileItem) {
        if ($window.FileReader) {
            var fileReader = new FileReader();
            fileReader.readAsDataURL(fileItem._file);

            fileReader.onload = function (fileReaderEvent) {
                $timeout(function () {
                    $scope.imageURL = fileReaderEvent.target.result;
                }, 0);
            };
        }
    };

    // Called after the user has successfully uploaded a new picture
    $scope.uploader.onSuccessItem = function (fileItem, r, status, headers) {
        if (r.message) Messages.showMessage(r.message, r.success ? 'success' : 'danger');
        $scope.imageURL = path;
        $scope.cancelUpload();
    };

    // Called after the user has failed to uploaded a new picture
    $scope.uploader.onErrorItem = function (fileItem, response, status, headers) {
        // Clear upload buttons
        $scope.cancelUpload();
        $scope.imageURL = path;
    };

    // Change user profile picture
    $scope.uploadProfilePicture = function () {
        $scope.uploader.uploadAll();
    };

    // Cancel the upload process
    $scope.cancelUpload = function () {
        $scope.uploader.clearQueue();
        $scope.imageURL = path;
    };
});
app.controller('homeCtrl', function ($scope, globals) {
    $scope.$on('event:mails', function () {
        $scope.mails = globals.mailMessages || [];
    });
    globals.getMessages();
    globals.getQuoteOfDay();
});
app.controller('profileCtrl', function ($scope, $rootScope, Messages, dialogs, $modal, globals, $http) {
    $scope.backText = 'Back';
    $scope.constants = globals.constants || {};

    $scope.addExperience = function () { $scope.editExperience('new'); }
    $scope.editExperience = function (p) { $scope.processEdit(p == 'new' ? {} : p, 'experience'); };

    $scope.addEducation = function () { $scope.editEducation('new'); }
    $scope.editEducation = function (p) {
        $scope.processEdit(p == 'new' ? {} : p, 'education');
    };

    $scope.addSkill = function () { $scope.editSkill('new'); }
    $scope.editSkill = function (p) { $scope.processEdit(p == 'new' ? {} : p, 'skill'); };

    $scope.addDependant = function () { $scope.editDependant('new'); }
    $scope.editDependant = function (p) { $scope.processEdit(p == 'new' ? {} : p, 'dependant'); };

    $scope.processEdit = function (item, name) {
        var editModal = $modal.open({
            backdrop: 'static',
            keyboard: false,
            templateUrl: '/pages/employee/add-' + name + '.html',
            controller: 'editCtrl',
            resolve: { item: function () { return { model: item, name: name }; } }
        });
        editModal.result.then(function (result) { globals.getUser(); });
    };
    $scope.editProfile = function () {
        if (!($scope.employee || {})._id)
            return Messages.showMessage('Record not loaded.')
        var modalEdit = $modal.open({
            backdrop: 'static',
            size: 'lg',
            templateUrl: '/pages/employee/employee-edit.html',
            controller: function ($scope, $modalInstance, item, globals, $timeout) {
                $scope.backText = 'Close'; $scope.disable = true;
                $scope.resetBtn = function () {
                    $scope.btnSaveLabel = 'Update Record'; $scope.updating = false; window.scrollTo(0, 0);
                }
                $scope.constants = globals.constants;
                $scope.resetBtn();
                $scope.employee = angular.copy(item);
                $scope.back = function () { $modalInstance.dismiss('Close'); };
                $scope.open = function ($event, control) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    $scope[control] = true;
                };
                $scope.saveData = function () {
                    if ($scope.form.$valid) {
                        $scope.btnSaveLabel = 'Updating Records'; $scope.updating = true;
                        $http.put('/employee', $scope.employee)
                            .success(function (result) {
                                $scope.resetBtn();
                                if (result.success) {
                                    if (result.message) Messages.showMessage(result.message, 'success');
                                    $modalInstance.close({ action: 'update', data: result.item });
                                }
                                else {
                                    if (result.errors.length > 0) {
                                        result.errors.forEach(function (item) {
                                            Messages.showModalMessage(item, 'danger');
                                        });
                                    }
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) if (result.errfor[p] == 'required') msg += (msg == '' ? '' : '<br/>') + p + ' is ' + result.errfor[p] + '. ';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }
                                }
                            })
                            .error(function (err) {
                                $scope.resetBtn();
                                if (err && err.error) Messages.showModalMessage(err.error, 'danger');
                            });
                    } else {
                        window.scrollTo(0, 0);
                        Messages.showModalMessage('Please ensure all required fields are entered', 'danger');
                    }
                };
            },
            resolve: { item: function () { return $scope.employee; } }
        });
        modalEdit
            .result
            .then(function (savedData) {
                globals.getUser();
            });
    };
});
app.controller('editCtrl', function ($scope, $modalInstance, globals, $http, Messages, item) {
    $scope.backText = 'Close';
    var identity = item.name;
    var path = item.path;
    $scope[identity] = angular.copy(item.model);
    $scope[identity].employee = $scope.employee._id;
    $scope['saving' + identity] = false;
    $scope.constants = globals.constants;
    $scope.back = function () { $modalInstance.dismiss('Close'); };
    $scope.saveData = function () {
        if (!$scope.form.$invalid) {
            $scope['saving' + identity] = true;
            $http.put('/employee/' + identity, $scope[identity])
                .success(function (result) {
                    $scope['saving' + identity] = false;
                    if (result.success) {
                        if (result.message) Messages.showMessage(result.message, 'success');
                        $modalInstance.close({ action: item._id ? 'update' : 'create', data: result.item });
                    }
                    else {
                        if (result.errors.length > 0) {
                            result.errors.forEach(function (item) {
                                Messages.showModalMessage(item, 'danger');
                            });
                        }
                        if (result.message) Messages.showModalMessage(result.message, 'danger');
                    }
                })
                .error(function (err, code) {
                    if (err) Messages.showModalMessage(err, 'danger');
                });
        }
    }
});
app.controller('supervisorCtrl', function ($scope, $rootScope, Messages, $modal, globals, $http) {
    $scope.getSupers = function () {
        $http.get('employee/supervisors')
            .success(function (result) {
                $scope.emps = result.emps; $scope.sups = result.sup;
            })
    };
    $scope.toggleSelection = function toggleSelection(i) {
        if (i._id == $scope.newAssign._id) return;
        var idx = $scope.newAssign.subordinates.indexOf(i._id);
        if (idx > -1) $scope.newAssign.subordinates.splice(idx, 1);
        else $scope.newAssign.subordinates.push(i._id);
    };
    $scope.getDispName = function (i) {
        var name = i.firstName + ' ' + i.lastName;
        if (i.supervisor) {
            var sname = ' (' + i.supervisor.firstName + ' ' + i.supervisor.lastName + ')';
            return name + sname;
        }
        return name;
    }
    $scope.isSub = function (id) {
        $scope.newAssign.supervisor
    }
    $scope.$watch('selectSup', function (n, o) {
        if (n == o) return;
        $scope.newAssign = angular.copy(n);
    });
    $scope.saveSupChanges = function () {
        $scope.updatingD = true;
        $http.post('/employee/supervisors', $scope.newAssign)
            .success(function (result) {
                if (result.success) {
                    if (result.message) Messages.showMessage(result.message, 'success');
                    $scope.getSupers();
                } else {
                    if ((result.errors || []).length > 0)
                        result.errors.forEach(function (item) {
                            Messages.showMessage(item, 'danger');
                        });
                    if (result.errfor) {
                        var msg = '';
                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                        if (msg != '') Messages.showMessage(msg, 'danger');
                    }
                }
                $scope.updatingD = false;
            }).error(function (err) {
                if (err && angular.isString(err)) Messages.showMessage(err, 'danger'); $scope.updatingD = false;
            })
    }
    $scope.getSupers();
});
app.controller('deptCtrl', function ($scope, $http, $modal, Messages) {
    $scope.getDepts = function () {
        $http.get('/organisations')
            .success(function (r) {
                $scope.orgs = r;
            })
            .error(function (r) {
            });
    };
    $scope.deleteOrg = function (item) {
        if (confirm('Are you sure you want to delete this department: ' + item.name)) {
            $http.delete('/organisations/' + item._id)
                .success(function (result) {
                    if (result.success) {
                        if (result.message) Messages.showMessage(result.message, 'success');
                        $scope.getDepts();
                    } else {
                        if (result.errors.length > 0)
                            result.errors.forEach(function (item) {
                                Messages.showMessage(item, 'danger');
                            });
                        if (result.errfor) {
                            var msg = '';
                            for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                            if (msg != '') Messages.showMessage(msg, 'danger');
                        }
                    }
                })
                .error(function (er) {
                    if (er && angular.isString(er)) Messages.showMessage(er, 'danger');
                });
        }
    };
    $scope.editOrg = function (itm) {
        $modal.open({
            backdrop: 'static',
            templateUrl: 'pages/edit-org.html',
            resolve: { item: function () { return itm == 'new' ? {} : itm; } },
            controller: function ($scope, $modalInstance, Messages, $http, item, globals) {
                $scope.org = angular.copy(item);
                $scope.org.designation = $scope.org.designation || [];
                $scope.constants = globals.constants;
                $scope.back = function () { $modalInstance.dismiss('Close'); };
                $scope.saveDept = function () {
                    $scope.updatingD = true;
                    $http.post('/organisations', $scope.org)
                        .success(function (result) {
                            if (result.success) {
                                if (result.message) Messages.showMessage(result.message, 'success');
                                $modalInstance.close({});
                            } else {
                                if (result.errors.length > 0)
                                    result.errors.forEach(function (item) {
                                        Messages.showModalMessage(item, 'danger');
                                    });
                                if (result.errfor) {
                                    var msg = '';
                                    for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                    if (msg != '') Messages.showModalMessage(msg, 'danger');
                                }
                            }
                            $scope.updatingD = false;
                        }).error(function (err) {
                            if (err && angular.isString(err)) Messages.showModalMessage(err, 'danger'); $scope.updatingD = false;
                        })
                };
                $scope.toggleDesignation = function (i) {
                    var idx = $scope.org.designations.indexOf(i);
                    if (idx > -1) $scope.org.designations.splice(idx, 1);
                    else $scope.org.designations.push(i);
                }
            }
        }).result.then(function () { $scope.getDepts(); });
    };
    $scope.getDepts();
});
app.controller('quoteCtrl', function ($scope, $http, $modal, Messages) {
    $scope.today = new Date(new Date().toDateString());
    $scope.getQuotes = function () {
        $http.get('/quotes', {
            ignoreLoadingBar: true
        })
            .success(function (r) {
                $scope.quotes = r;
            })
            .error(function (r) {
            });
    };
    $scope.deleteQuote = function (item) {
        if (confirm('Are you sure you want to delete this qoute: \nTitle:' + item.title + '\nText:' + item.text)) {
            $http.delete('/quote/' + item._id)
                .success(function (result) {
                    if (result.success) {
                        if (result.message) Messages.showMessage(result.message, 'success');
                        $scope.getQuotes();
                    } else {
                        if (result.errors.length > 0)
                            result.errors.forEach(function (item) {
                                Messages.showMessage(item, 'danger');
                            });
                        if (result.errfor) {
                            var msg = '';
                            for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                            if (msg != '') Messages.showMessage(msg, 'danger');
                        }
                    }
                })
                .error(function (er) {
                    if (er && angular.isString(er)) Messages.showMessage(er, 'danger');
                });
        }
    };
    $scope.editQuote = function (itm) {
        $modal.open({
            backdrop: 'static',
            templateUrl: 'pages/edit-quote.html',
            resolve: { item: function () { return itm == 'new' ? {} : itm; } },
            controller: function ($scope, $modalInstance, Messages, $http, item) {
                $scope.quote = angular.copy(item);
                $scope.back = function () { $modalInstance.dismiss('Close'); };
                $scope.saveQuote = function () {
                    $scope.updatingD = true;
                    $http.post('/quotes', $scope.quote)
                        .success(function (result) {
                            if (result.success) {
                                if (result.message) Messages.showMessage(result.message, 'success');
                                $modalInstance.close({});
                            } else {
                                if (result.errors.length > 0)
                                    result.errors.forEach(function (item) {
                                        Messages.showModalMessage(item, 'danger');
                                    });
                                if (result.errfor) {
                                    var msg = '';
                                    for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                    if (msg != '') Messages.showModalMessage(msg, 'danger');
                                }
                            }
                            $scope.updatingD = false;
                        }).error(function (err) {
                            if (err && angular.isString(err)) Messages.showModalMessage(err, 'danger'); $scope.updatingD = false;
                        })
                }
            }
        }).result.then(function () { $scope.getQuotes(); });
    };
    $scope.getQuotes();
});
app.controller('trainingCtrl', function ($scope, $http, $modal, Messages, globals) {
    $scope.today = new Date(new Date().toDateString());
    $scope.getTrainings = function () {
        $http.get('/trainings')
            .success(function (r) {
                $scope.trainings = r;
            })
            .error(function (r) {
            });
    };
    $scope.getEmps = function () {
        $http.get('admin/employees')
            .success(function (result) {
                globals.employees = result.employees;
                $scope.employees = result.employees; $scope.employeeGroups = result.byDepartment;
                $scope.selectedEmp = globals.employees[0];
            });
    };
    if (!globals.employees) $scope.getEmps();
    $scope.editTraining = function (itm) {
        $modal.open({
            backdrop: 'static',
            size: 'lg',
            templateUrl: 'pages/edit-training.html',
            resolve: { item: function () { return itm == 'new' ? {} : itm; } },
            controller: function ($scope, $modalInstance, Messages, $http, item) {
                $scope.training = angular.copy(item);
                $scope.toggleSelection = function toggleSelection(i) {
                    var idx = $scope.training.invited.indexOf(i._id);
                    // is currently selected
                    if (idx > -1) $scope.training.invited.splice(idx, 1);
                        // is newly selected
                    else $scope.training.invited.push(i._id);
                };
                $scope.back = function () { $modalInstance.dismiss('Close'); };
                $scope.saveTraining = function () {
                    $scope.updatingD = true;
                    $http.post('/trainings', $scope.training)
                        .success(function (result) {
                            if (result.success) {
                                if (result.message) Messages.showMessage(result.message, 'success');
                                $modalInstance.close({});
                            } else {
                                if ((result.errors || []).length > 0)
                                    result.errors.forEach(function (item) { Messages.showModalMessage(item, 'danger'); });
                                if (result.errfor) {
                                    var msg = '';
                                    for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                    if (msg != '') Messages.showModalMessage(msg, 'danger');
                                }
                            }
                            $scope.updatingD = false;
                        }).error(function (err) {
                            if (err && angular.isString(err)) Messages.showModalMessage(err, 'danger'); $scope.updatingD = false;
                        })
                }
            }
        }).result.then(function () { $scope.getTrainings(); });
    };
    $scope.viewTraining = function (itm) {
        $modal.open({
            backdrop: 'static',
            size: 'lg',
            templateUrl: 'pages/view-training.html',
            resolve: { item: function () { return itm; } },
            controller: function ($scope, $modalInstance, Messages, $http, item, $filter) {
                $scope.training = angular.copy(item);
                $scope.back = function () { $modalInstance.dismiss('Close'); };
            }
        }).result.then(function () { $scope.getTrainings(); });
    };
    $scope.getTrainings();
});
app.controller('employeesCtrl', function ($scope, $http, $modal, Messages, globals, $location) {
    $scope.refresh = function (ex) {
        switch(ex){
            case 'exit':
                $http.get('employee/exited')
                    .success(function (result) {
                        globals.employeesInactive = result.employees;
                        $scope.employeesInactive = result.employees; $scope.employeesInactiveGroups = result.byDepartment;
                    });
                break;
            case 'card':
                $http.get('employee/card')
                    .success(function (result) {
                        globals.employeeCards = result.employees;
                        $scope.employees = result.employees; $scope.employeeGroups = result.byDepartment;
                    })
                    .error(function (err) {
                        if (err) Messages.showMessage(err, 'danger');
                    });
                break;
            case 'cash':
                $scope.$watch('ft.y', function (n, o) {
                    if (!n) return;
                    else  getMonthData(n.months, n.max);
                });
                $http.get('/employee/allrequests')
                    .success(function (result) {
                        $scope.cashRequests = result.cashRequests;
                        $scope.allrequests = result;
                        $scope.ft = { y: result.cashRequests[0], m: globals.indexMonths[result.cashRequests[0].max - 1] };
                    })
                    .error(function (err) {
                        if (err) Messages.showMessage(err, 'danger');
                    });
                break;
            default:
                $http.get('employee')
                .success(function (result) {
                    globals.employees = result.employees;
                    $scope.employees = result.employees; $scope.employeeGroups = result.byDepartment;
                })
                .error(function (err) {
                    if (err) Messages.showMessage(err, 'danger');
                });
                $http.get('/employee/allrequests')
                    .success(function (result) {
                        $scope.allrequests = result;
                    });
                break;
        }
    };
    var getMonthData = function (months, m) {
        $scope.monthRequests = [];
        $scope.ft.m = $scope.ft.m || globals.indexMonths[m - 1];
        months.forEach(function (i) { if (i.month - 1 == $scope.ft.m.index) return $scope.monthRequests = i.status; });
    };
    $scope.ichanged = function () { getMonthData($scope.ft.y.months); };
    $scope.createEmployee = function () {
        var modalEdit = $modal.open({
            backdrop: 'static',
            templateUrl: '/pages/employee/employee-create.html',
            controller: function ($scope, $modalInstance, globals, $timeout) {
                $scope.backText = 'Close'; $scope.disable = false;
                $scope.constants = globals.constants;
                $scope.employee = {};
                $scope.back = function () { $modalInstance.dismiss('Close'); };
                $scope.open = function ($event, control) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    $scope[control] = true;
                };
                $scope.saveData = function () {
                    if (!$scope.form.$invalid) {
                        $scope.employee.department = $scope.employee.department._id;
                        $http.post('/employee', $scope.employee)
                            .success(function (result) {
                                var msg = '';
                                if (result.success) {
                                    if (result.message) Messages.showMessage(result.message, 'success');
                                    $modalInstance.close({ action: 'new', data: result.item });
                                }
                                else {
                                    if (result.errors.length > 0) {
                                        result.errors.forEach(function (item) {
                                            Messages.showMessage(item, 'danger');
                                        });
                                    }
                                    if (result.errfor) {
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                        if (msg != '') Messages.showMessage(msg, 'danger');
                                    }
                                }
                            })
                            .error(function (err) { });
                    }
                }
            }
        });
        modalEdit
            .result
            .then(function (savedData) {
                $scope.refresh();
                if (savedData && savedData.action == 'update') {
                    if (savedData.item) $scope.employee = savedData.item;
                    Messages.showMessage('Successfully updated employee record', 'success');
                } else if (savedData && savedData.action == 'new') {
                    Messages.showMessage('Successfully created an employee', 'success');
                }
            });
    };
    $scope.access = function (req) {
        var modal = $modal.open({
            backdrop: 'static',
            templateUrl: '/pages/finance/pd-cash-details.html',
            controller: function ($scope, item, $modalInstance) {
                $scope.req = item;
                $scope.back = function () { $modalInstance.dismiss('Close'); };
                $scope.pdapprove = function () {
                    $http.post('/finance/pdapprovecash', $scope.req)
                        .success(function (result) {
                            if (result.success) {
                                if (result.message) Messages.showMessage(result.message, 'success');
                                $modalInstance.close();
                            }
                            else {
                                if (result.errors.length > 0) {
                                    result.errors.forEach(function (item) {
                                        Messages.showMessage(item, 'danger');
                                    });
                                }
                                if (result.errfor) {
                                    var msg = '';
                                    for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                    if (msg != '') Messages.showMessage(msg, 'danger');
                                }
                            }
                        })
                        .error(function (err) {
                            if (err) Messages.showMessage(err, 'danger');
                        });
                };
                $scope.pddecline = function () {
                    $http.post('/finance/pddeclinecash', $scope.req)
                        .success(function (result) {
                            if (result.success) {
                                if (result.message) Messages.showMessage(result.message, 'success');
                                $modalInstance.close();
                            }
                            else {
                                if (result.errors.length > 0) {
                                    result.errors.forEach(function (item) {
                                        Messages.showMessage(item, 'danger');
                                    });
                                }
                                if (result.errfor) {
                                    var msg = '';
                                    for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                    if (msg != '') Messages.showMessage(msg, 'danger');
                                }
                            }
                        })
                        .error(function (err) {
                            if (err) Messages.showMessage(err, 'danger');
                        });
                };
            },
            resolve: { item: function () { return req; } }
        });
        modal.result.then(function (result) {
            $scope.refresh('cash');
        });
    };
    $scope.resetPassword = function (id) {
        $http.put('/admin/reset/' + id)
            .success(function (result) {
                if (result.message) Messages.showMessage(result.message, result.success ? 'success' : 'info');
                if (result.success) $scope.sel = {};
            }).error(function (data, status) {
                Messages.showMessage('Error: ' + status, 'danger');
            });
    };
    $scope.viewEmployeeCard = function(emp){
        $modal.open({
            backdrop: 'static',
            size: 'lg',
            templateUrl: '/pages/employee/employee-data-card.html',
            controller: function ($scope, $modalInstance, item, globals, $timeout) {
                $scope.backText = 'Close'; $scope.disable = false; $scope.isEdit = true;
                $scope.emp = angular.copy(item);
                $scope.back = function () { $modalInstance.dismiss('Close'); };
            },
            resolve: { item: function () { return emp; } }
        })
    }
    $scope.editEmployee = function (emp) {
       $modal.open({
            backdrop: 'static',
            size: 'lg',
            templateUrl: '/pages/employee/employee-edit-hr.html',
            controller: function ($scope, $modalInstance, item, globals, $timeout) {
                $scope.backText = 'Close'; $scope.disable = false; $scope.isEdit = true;
                $scope.constants = globals.constants;
                $scope.employee = angular.copy(item);
                $scope.back = function () { $modalInstance.dismiss('Close'); };
                $scope.open = function ($event, control) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    $scope[control] = true;
                };
                $scope.saveData = function () {
                    if ($scope.form.$valid) {
                        $http.put('/employee', $scope.employee)
                            .success(function (result) {
                                if (result.success) {
                                    if (result.message) Messages.showMessage(result.message, 'success');
                                    $modalInstance.close({ action: 'create', data: result.item });
                                }
                                else {
                                    if (result.errors.length > 0)
                                        result.errors.forEach(function (item) {
                                            Messages.showModalMessage(item, 'danger');
                                        });
                                    //if (result.errfor) {
                                    //    var msg = '';
                                    //    for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                    //    if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    //}
                                    if (result.message) Messages.showMessage(result.message, 'd');
                                }
                            })
                            .error(function (err) {
                                if (err) Messages.showModalMessage(err, 'danger');
                            });
                    } else {
                        $scope.errText = 'Please ensure all required fields are entered';
                        Messages.showModalMessage($scope.errText, 'danger');
                    }
                }
            },
            resolve: { item: function () { return emp; } }
        })
            .result
            .then(function () { $scope.refresh(); });
    };
    if ($location.$$path.indexOf('exited') > -1 && !$scope.employeesInactive) $scope.refresh('exit');
    if ($location.$$path.indexOf('card') > -1 && !$scope.employeeCards) $scope.refresh('card');
    if ($location.$$path.indexOf('cashlist') > -1 && !$scope.employeeCards) $scope.refresh('cash');
    else if (!$scope.employees) $scope.refresh();
});
app.controller('requestCtrl', function ($scope, $http, globals, Messages, $modal) {
    $scope.open = function ($event, control) {
        $event.preventDefault();
        $event.stopPropagation();
        $scope[control] = true;
    };
    $scope.refresh = function () {
        $http.get('/employee/requests')
            .success(function (result) {
                globals.requests = result;
                $scope.cash = globals.requests.cash;
                $scope.leave = globals.requests.leave;
            })
    }
    if (globals.requests && globals.requests.cash) {
        $scope.cash = globals.requests.cash; $scope.leave = globals.requests.leave;
    } else $scope.refresh();
    function s() {
        $scope.superiors = globals.superiors;
        $scope.supervisor = globals.supervisor;
    }
    if (globals.superiors) s(); else
        $http.get('/employee/superiors')
            .success(function (result) {
                globals.superiors = result.superiors;
                globals.supervisor = result.supervisor;
                s();
            });
    $scope.myCash = function () {
        $modal.open({
            backdrop: 'static',
            templateUrl: '/pages/my-cash-previous.html',
            controller:['$scope', '$modalInstance', 'item', function ($scope, $modalInstance, item) {
                $scope.reqs = item;
                $scope.back = function () { $modalInstance.dismiss('Close'); };
            }],
            size: 'lg',
            resolve: { item: function () { return $scope.cash; } }
        });
    };
    $scope.constants = globals.constants;
    $scope.saveData = function () {
        if (!$scope.form.$invalid) {
            $scope.savingData = true;
            $http.post('/finance/cashrequest', $scope.request)
                .success(function (result) {
                    $scope.savingData = false;
                    if (result.success) {
                        if (result.message) Messages.showMessage(result.message, 'success');
                        $scope.refresh();
                        globals.navigateTo('/');
                    }
                    else {
                        if (result.errors.length > 0) {
                            result.errors.forEach(function (item) {
                                Messages.showMessage(item, 'danger');
                            });
                        }
                        if (result.errfor) {
                            var msg = '';
                            for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                            if (msg != '') Messages.showMessage(msg, 'danger');
                        }
                    }
                })
                .error(function (err) {
                    $scope.savingData = false;
                    if (err && err.error) Messages.showMessage(err.error, 'danger');
                });
        }
    };

    $scope.leaveRequest = function () {
        var modalEdit = $modal.open({
            backdrop: 'static',
            templateUrl: '/pages/leave-request-edit.html',
            controller: function ($scope, $modalInstance, item, globals, $filter) {
                $scope.backText = 'Close'; $scope.disable = false; $scope.isEdit = true;
                $scope.now = new Date(); $scope.superiors = globals.superiors;
                $scope.emp = angular.copy(item); $scope.newLeave = {}; $scope.newLeave.type = 'Annual';
                var ttr = 'Make Request'; $scope.btnText = ttr;
                $scope.back = function () { $modalInstance.dismiss('Close'); };
                $scope.open = function ($event, control) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    $scope[control] = true;
                };
                $scope.makeLeaveRequest = function () {
                    if ($scope.form.$valid) {
                        $scope.submitting = true; $scope.btnText = 'Requesting Leave';
                        $http.post('vacation/leaverequest', $scope.newLeave)
                            .success(function (result) {
                                if (result.success) {
                                    if (result.message) Messages.showMessage(result.message, 'success');
                                    $modalInstance.close();
                                }
                                else {
                                    if (result.errors.length > 0)
                                        result.errors.forEach(function (item) {
                                            Messages.showModalMessage(item, 'danger');
                                        });
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + '';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }
                                }
                                $scope.btnText = ttr; $scope.submitting = false;
                            })
                            .error(function (err) {
                                if (err.error) Messages.showModalMessage(err.error, 'danger'); $scope.btnText = ttr; $scope.submitting = false;
                            })
                    } else {
                        Messages.showModalMessage('Correct all error and submit again', 'danger');
                    }
                };
                $scope.setEndDate = function () {
                    if ($scope.newLeave.start && $scope.newLeave.days > 0) $scope.newLeave.resume = $filter('date')(new Date($scope.newLeave.start).nextDay($scope.newLeave.days, $scope.newLeave.type == 'Parenting'), 'EEE,dd MMM yyyy');
                    else $scope.newLeave.resume = undefined;
                };
                $scope.$watch('newLeave.start', function () { $scope.setEndDate(); });
                $scope.$watch('newLeave.days', function () { $scope.setEndDate(); });
            },
            resolve: { item: function () { return $scope.employee; } }
        });
        modalEdit
            .result
            .then(function (savedData) { $scope.refresh(); });
    };
});
app.controller('teamCtrl', function ($scope, $http, globals, Messages, $modal, $location) {
    $scope.assignLocal = function () {
        $scope.subcash = globals.subrequests.cash;
        $scope.subleave = globals.subrequests.leave;
        if ($location.path() == '/subleave') $scope.req = $scope.subleave[0];
    };
    $scope.refresh = function () {
        globals.getTeamRequests().success(function () { $scope.assignLocal(); });
    };
    $scope.refresh();

    $scope.access = function (req) {
        var modal = $modal.open({
            backdrop: 'static',
            templateUrl: '/pages/sub-cash-details.html',
            controller: function ($scope, item, $modalInstance) {
                $scope.req = item;
                $scope.back = function () { $modalInstance.dismiss('Close'); };
                $scope.approve = function () {
                    $http.post('finance/approvecash', $scope.req)
                        .success(function (result) {
                            if (result.success) {
                                if (result.message) Messages.showMessage(result.message, 'success');
                                $modalInstance.close({});
                            }
                            else {
                                if (result.errors.length > 0)
                                    result.errors.forEach(function (item) {
                                        Messages.showModalMessage(item, 'danger');
                                    });
                                if (result.errfor) {
                                    var msg = '';
                                    for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                    if (msg != '') Messages.showModalMessage(msg, 'danger');
                                }
                            }
                        })
                        .error(function (err) {
                            if (err && err.error) Messages.showModalMessage(err.error, 'danger');
                        });
                };
                $scope.decline = function () {
                    $http.post('finance/declinecash', $scope.req)
                        .success(function (result) {
                            if (result.success) {
                                if (result.message) Messages.showMessage(result.message, 'success');
                                $modalInstance.close({ action: 'create', data: result.item });
                            }
                            else {
                                if (result.errors.length > 0)
                                    result.errors.forEach(function (item) {
                                        Messages.showModalMessage(item, 'danger');
                                    });
                                if (result.errfor) {
                                    var msg = '';
                                    for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                    if (msg != '') Messages.showModalMessage(msg, 'danger');
                                }
                            }
                        })
                        .error(function (err) {
                            if (err && err.error) Messages.showModalMessage(err.error, 'danger');
                        });
                };
            },
            resolve: { item: function () { return req; } }
        });
        modal.result.then(function (result) {
            $scope.refresh();
        });
    }

    $scope.approveLeave = function () {
        $http.post('vacation/approveleave', $scope.req)
            .success(function (result) {
                if (result.success) {
                    if (result.message) Messages.showMessage(result.message, 'success');
                    $scope.refresh();
                }
                else {
                    if (result.errors.length > 0)
                        result.errors.forEach(function (item) {
                            Messages.showMessage(item, 'danger');
                        });
                    if (result.errfor) {
                        var msg = '';
                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                        if (msg != '') Messages.showMessage(msg, 'danger');
                    }
                }
            })
            .error(function (err) {
                if (err && err.error) Messages.showMessage(err.error, 'danger');
            });
    }
    $scope.declineLeave = function () {
        $http.post('/vacation/declineleave', $scope.req)
            .success(function (result) {
                if (result.success) {
                    if (result.message) Messages.showMessage(result.message, 'success');
                    $scope.refresh();
                }
                else {
                    if (result.errors.length > 0)
                        result.errors.forEach(function (item) { Messages.showMessage(item, 'danger'); });
                    if (result.errfor) {
                        var msg = '';
                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' '; if (msg != '') Messages.showMessage(msg, 'danger');
                    }
                }
            })
            .error(function (err) {
                if (err && err.error) Messages.showMessage(err.error, 'danger');
            });
    }
});
app.controller('financeCtrl', function ($scope, $http, globals, Messages, $modal, $location) {
    if ($location.$$path == '/approvedcash') {
        if (globals.financeCash) $scope.financeCash = globals.financeCash;
        else $http.get('/finance/financecash')
            .success(function (result) {
                globals.financeCash = result;
                $scope.financeCash = globals.financeCash;
                $scope.ft = { y: result[0], m: globals.indexMonths[result[0].max - 1] };
            });
        var getMonthData = function (months, m) {
            $scope.monthRequests = [];
            $scope.ft.m = $scope.ft.m || globals.indexMonths[m - 1];
            months.forEach(function (i) { if (i.month - 1 == $scope.ft.m.index) return $scope.monthRequests = i.status; });
        };
        $scope.$watch('ft.y', function (n, o) {
            if (!n) return;
            else  getMonthData(n.months, n.max);
        });
        $scope.ichanged = function () { getMonthData($scope.ft.y.months); };
        $scope.access = function (req) {
            var modal = $modal.open({
                backdrop: 'static',
                templateUrl: '/pages/finance/approved-cash-details.html',
                controller: function ($scope, item, $modalInstance) {
                    $scope.req = item;
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                    $scope.release = function () {
                        $http.post('/finance/cashreleased', $scope.req)
                            .success(function (result) {
                                if (result.success) {
                                    if (result.message) Messages.showMessage(result.message, 'success');
                                    $modalInstance.close({});
                                }
                                else {
                                    if (result.errors.length > 0)
                                        result.errors.forEach(function (item) {
                                            Messages.showModalMessage(item, 'danger');
                                        });
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }
                                }
                            })
                            .error(function (err) {
                                if (err && err.error) Messages.showModalMessage(err.error, 'danger');
                            });
                    };
                    $scope.retire = function () {
                        $http.post('/finance/cashretired', $scope.req)
                            .success(function (result) {
                                if (result.success) {
                                    if (result.message) Messages.showMessage(result.message, 'success');
                                    $modalInstance.close({});
                                }
                                else {
                                    if (result.errors.length > 0)
                                        result.errors.forEach(function (item) {
                                            Messages.showModalMessage(item, 'danger');
                                        });
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }
                                }
                            })
                            .error(function (err) {
                                if (err && err.error) Messages.showModalMessage(err.error, 'danger');
                            });
                    };
                },
                resolve: { item: function () { return req; } }
            });
            modal.result.then(function (savedData) {
                $http.get('/finance/financecash')
                    .success(function (result) {
                        globals.financeCash = result;
                        $scope.financeCash = globals.financeCash;
                    });
            });
        }
    }
    else {
        $scope.cashReportType = "Monthly";
        $scope.date = new Date();
        var getLabel = function (day) {
            var r = '';
            var lst = $scope.getLastDayinMonth($scope.ft.m.index, $scope.year);
            if (day > lst) return 'Unknown';
            switch (day) {
                case 1: case 21: case 31: r = day + 'st'; break;
                case 2: case 22: r = day + 'nd'; break;
                case 3: case 23: r = day + 'rd'; break;
                default: r = day + 'th';
            };
            return $scope.globals.days[new Date($scope.ft.y._id, $scope.ft.m.index, day).getDay()] + ' ' + r;
        };
        var getMonthData = function (months, m) {
            $scope.ft.m = $scope.ft.m || globals.indexMonths[m - 1];
            months.forEach(function (i) { if (i.month - 1 == $scope.ft.m.index) return $scope.setUpMonthChart(i); });
        };
        $scope.getCashDisbursed = function () {
            var url = '/finance/cashreport';
            $http.get(url).success(function (result) {
                $scope.cashreport = result;
                $scope.ft = { y: result[0], m: globals.indexMonths[result[0].max - 1] };
            }).error(function (err) { if (err) Messages.showMessage(err, 'danger'); });
        };
        $scope.getCashDisburseds = function (date) {
            var url = '/finance/cashreleased';
            var monthly = $scope.cashReportType === "Monthly";
            if (monthly) url += "mtd";
            else url += "ytd";
            //url += "?date=" + new Date($scope.year, $scope.month, 1);
            date = date || new Date();
            $scope.month = date.getMonth();
            $scope.year = date.getFullYear();
            $http.post(url, { date: date }).success(function (result) {
                $scope.cashreport = result;
                var data = [], labels = [];
                if (monthly) {
                    $scope.graph = "line";
                    result.forEach(function (obj) {
                        obj.label = obj._id;
                        data[obj._id - 1] = obj.total;
                        labels[obj._id - 1] = getLabel(obj._id);
                    });
                    for (var i = 0; i < data.length; i++) if (data[i] == undefined || data[i] == null) { data[i] = 0; labels[i] = getLabel(i + 1); }
                    $scope.chartData = [data];
                    $scope.chartLabels = labels;
                }
                else {
                    $scope.graph = "bar";
                    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                    result.forEach(function (obj) {
                        obj.label = months[obj._id - 1];
                    });
                }
            }).error(function (err) { if (err) Messages.showMessage(err, 'danger'); });
        };
        $scope.getCashDisbursed();
        $scope.ichanged = function () { getMonthData($scope.ft.y.months); };
        $scope.setUpYearChart = function (n) {
            var data = [], labels = [];
            n.months.forEach(function (i) {
                data[i.month - 1] = i.amount;
                labels[i.month - 1] = globals.months[i.month - 1];
            });
            for (var i = 0; i < data.length; i++) if (data[i] == undefined || data[i] == null) { data[i] = 0; labels[i] = globals.months[i]; }
            $scope.yChartData = [data];
            $scope.yChartLabels = labels;
            getMonthData(n.months, n.max);
        };
        $scope.setUpMonthChart = function (k) {
            var data = [], labels = [];
            k.days.forEach(function (obj) {
                data[obj.day - 1] = obj.amount;
                labels[obj.day - 1] = getLabel(obj.day);
            });
            for (var i = 0; i < data.length; i++) if (data[i] == undefined || data[i] == null) { data[i] = 0; labels[i] = getLabel(i + 1); }
            $scope.chartData = [data];
            $scope.chartLabels = labels;
        }
        $scope.$watch('ft.y', function (n, o) {
            if (!n) return;
            else $scope.setUpYearChart(n);
        });
    }
});
app.controller('leaveCtrl', function ($scope, $http, globals, Messages, $modal, $filter) {
    $scope.getEnts = function () {
        $http.get('/vacation/entitlement')
            .success(function (result) {
                globals.entitlements = result;
                $scope.entitlements = globals.entitlements;
            })
    };
    $scope.getHols = function () {
        $http.get('/employee/holiday')
            .success(function (result) {
                globals.holidays = result; $scope.holidays = globals.holidays;
            })
    };
    $scope.getEmps = function () {
        $http.get('admin/employees')
            .success(function (result) {
                globals.employees = result.employees;
                $scope.employees = result.employees;
                $scope.employeeGroups = result.byDepartment;
                if ($scope.selectedEmp) {
                    var found = false, id = $scope.selectedEmp._id;
                    $scope.selectedEmp = {};
                    for (var i = 0; i < result.employees.length; i++) {
                        if (result.employees[i]._id == id) {$scope.selectedEmp = result.employees[i]; found = true; break;}
                    }
                    if (!found) $scope.selectedEmp = result.employees[0];
                } else $scope.selectedEmp = result.employees[0];
            })
    };

    if (globals.entitlements) $scope.entitlements = globals.entitlements; else $scope.getEnts();
    if (globals.holidays) $scope.holidays = globals.holidays; else $scope.getHols();
    $scope.getEmps();
    var ttr = 'Update Leave Calender';
    $scope.newLeave = {}; $scope.btnText = ttr;
    $scope.editEntitlement = function (emp) {
        var modalEdit = $modal.open({
            backdrop: 'static',
            templateUrl: '/pages/leave-entitlement-edit.html',
            controller: function ($scope, $modalInstance, item, globals, $timeout) {
                $scope.backText = 'Close';
                $scope.entitlement = angular.copy(item);
                $scope.back = function () { $modalInstance.dismiss('Close'); };
                $scope.saveEntitlement = function () {
                    if ($scope.form.$valid) {
                        $http.post('/vacation/entitlement', $scope.entitlement)
                            .success(function (result) {
                                if (result.success) {
                                    if (result.message) Messages.showMessage(result.message, 'success');
                                    $modalInstance.close({ action: 'create', data: result.item });
                                }
                                else {
                                    if (result.errors.length > 0)
                                        result.errors.forEach(function (item) {
                                            Messages.showModalMessage(item, 'danger');
                                        });
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }
                                }
                            })
                            .error(function (err) {
                                if (err) Messages.showModalMessage(err, 'danger');
                            });
                    }
                }
            },
            resolve: { item: function () { return emp == 'new' || !emp ? {} : emp; } }
        });
        modalEdit
            .result
            .then(function (result) { $scope.getEnts(); });
    };
    $scope.editHoliday = function (emp) {
        var modalEdit = $modal.open({
            backdrop: 'static',
            templateUrl: '/pages/holiday-edit.html',
            controller: function ($scope, $modalInstance, item, globals, $timeout, $filter) {
                $scope.backText = 'Close';
                $scope.holiday = angular.copy(item);
                if($scope.holiday.resumption) $scope.holiday.resume = $filter('date')($scope.holiday.resumption, 'dd MMM yyyy');
                else $scope.holiday.resume = undefined;
                $scope.back = function () { $modalInstance.dismiss('Close'); };
                $scope.saveHoliday = function () {
                    if ($scope.form.$valid) {
                        $http.post('/employee/holiday', $scope.holiday)
                            .success(function (result) {
                                if (result.success) {
                                    if (result.message) Messages.showMessage(result.message, 'success');
                                    $modalInstance.close({ action: 'create', data: result.item });
                                }
                                else {
                                    if (result.errors.length > 0)
                                        result.errors.forEach(function (item) {
                                            Messages.showModalMessage(item, 'danger');
                                        });
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }
                                }
                            })
                            .error(function (err) {
                                if (err) Messages.showModalMessage(err, 'danger');
                            });
                    }
                };
                $scope.setResDate = function () {
                    if ($scope.holiday.start && $scope.holiday.days > 0) $scope.holiday.resume = $filter('date')(new Date($scope.holiday.start).nextDay($scope.holiday.days), 'EEE,dd MMM yyyy');
                    else $scope.holiday.resume = undefined;
                };
                $scope.$watchGroup(['holiday.start', 'holiday.days'], function () { $scope.setResDate(); });
                //$scope.$watch('holiday.start', function () { $scope.setResDate(); });
                $scope.open = function ($event, control) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    $scope[control] = true;
                };
            },
            resolve: { item: function () { return emp == 'new' || !emp ? {} : emp; } }
        });
        modalEdit
            .result
            .then(function () { $scope.getHols(); });
    };
    $scope.allocate = function () {
        var modalEdit = $modal.open({
            backdrop: 'static',
            templateUrl: '/pages/leave-allocation-edit.html',
            controller: function ($scope, $modalInstance, globals, $filter) {
                $scope.reallocate = function () {
                    $scope.allocation = {
                        level1: $filter('filter')(globals.employees, { leaveLevel: "Level 1" }),
                        level2: $filter('filter')(globals.employees, { leaveLevel: "Level 2" })
                    }
                };
                $scope.reallocate();
                $scope.back = function () { $modalInstance.dismiss('Close'); };
                $scope.submit = function () {
                    $http.post('/vacation/reallocatelevel', $scope.changes)
                        .success(function (result) {
                            if (result.success) {
                                if (result.message) Messages.showMessage(result.message, 'success');
                                $modalInstance.close();
                            }
                            else {
                                if (result.errors.length > 0)
                                    result.errors.forEach(function (item) {
                                        Messages.showModalMessage(item, 'danger');
                                    });
                                if (result.errfor) {
                                    var msg = '';
                                    for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                    if (msg != '') Messages.showModalMessage(msg, 'danger');
                                }
                            }
                        })
                        .error(function (err) {
                            if (err && err.error) Messages.showModalMessage(err.error, 'danger');
                        });
                }
                $scope.changes = [];
                $scope.move = function (direction) {
                    switch (direction) {
                        case 'right':
                            if ($scope.level1 && $scope.level1.length > 0) {
                                $scope.level1.forEach(function (item) {
                                    var i = globals.employees.indexOf(item);
                                    if (i != -1) {
                                        globals.employees[i].leaveLevel = 'Level 2';
                                        if ($scope.changes.indexOf(item) == -1)
                                            $scope.changes.push(globals.employees[i]);
                                        else $scope.changes.splice($scope.changes.indexOf(item), 1);
                                    }
                                })
                                $scope.reallocate();
                            }
                            break;
                        case 'left':
                            if ($scope.level2 && $scope.level2.length > 0) {
                                $scope.level2.forEach(function (item) {
                                    var i = globals.employees.indexOf(item);
                                    if (i != -1) {
                                        globals.employees[i].leaveLevel = 'Level 1';
                                        if ($scope.changes.indexOf(item) == -1)
                                            $scope.changes.push(globals.employees[i]);
                                        else $scope.changes.splice($scope.changes.indexOf(item), 1);
                                    }
                                })
                                $scope.reallocate();
                            }
                            break;
                    }
                }
            }
        });
        modalEdit
            .result
            .then(function (result) { $scope.getEmps(); });
    };
    $scope.allocateEmpLeave = function (emp) {
        var fields = {
            employee: emp,
            leave: $scope.newLeave
        };
        $scope.submitting = true; $scope.btnText = 'Updating';
        $http.post('vacation/allocateleave', fields)
            .success(function (result) {
                if (result.success) {
                    if (result.message) Messages.showModalMessage(result.message, 'success');
                    $scope.getEmps(); $scope.newLeave = {};
                }
                else {
                    if (result.errors.length > 0)
                        result.errors.forEach(function (item) {
                            Messages.showModalMessage(item, 'danger');
                        });
                    if (result.errfor) {
                        var msg = '';
                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                    }
                }
                $scope.btnText = ttr; $scope.submitting = false;
            })
            .error(function (err) {
                if (err) Messages.showModalMessage(err, 'danger'); $scope.btnText = ttr; $scope.submitting = false;
            });
    };
    $scope.pdApproveLeave = function () {
        $http.post('/vacation/pdapproveleave', $scope.eReq)
            .success(function (result) {
                if (result.success) {
                    if (result.message) Messages.showModalMessage(result.message, 'success');
                    $scope.eReq = undefined; $scope.getEmps();
                }
                else {
                    if (result.errors.length > 0) {
                        result.errors.forEach(function (item) {
                            Messages.showModalMessage(item, 'danger');
                        });
                    }
                    if (result.errfor) {
                        var msg = '';
                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                    }
                }
            })
            .error(function (err) {
                if (err) Messages.showModalMessage(err, 'danger');
            });
    };
    $scope.pdDeclineLeave = function () {
        $http.post('/vacation/pddeclineleave', $scope.eReq)
            .success(function (result) {
                if (result.success) {
                    if (result.message) Messages.showModalMessage(result.message, 'success');
                    $scope.eReq = undefined; $scope.getEmps();
                }
                else {
                    if (result.errors.length > 0) {
                        result.errors.forEach(function (item) {
                            Messages.showModalMessage(item, 'danger');
                        });
                    }
                    if (result.errfor) {
                        var msg = '';
                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                    }
                }
            })
            .error(function (err) {
                if (err && err.error) Messages.showModalMessage(err.error, 'danger');
            });
    };
    $scope.eEndDate = function () {
        if(!$scope.eReq) return;
        if ($scope.eReq.start && $scope.eReq.days > 0) $scope.eReq.resume = $filter('date')(new Date($scope.eReq.start).nextDay($scope.eReq.days, $scope.newLeave.type == 'Parenting'), 'EEE,dd MMM yyyy');
        else $scope.eReq.resume = undefined;
    };
    $scope.setEndDate = function () {
        if ($scope.newLeave.start && $scope.newLeave.days > 0)
            $scope.newLeave.resume = $filter('date')(new Date($scope.newLeave.start).nextDay($scope.newLeave.days, $scope.newLeave.type == 'Parenting'), 'EEE,dd MMM yyyy');
        else $scope.newLeave.resume = undefined;
    };
    $scope.empChanged = function (n) { $scope.newLeave = {}; $scope.eReq = null; };
    $scope.$watch('newLeave.start', function (n) {
        if (!n) return;
        var date = new Date($scope.newLeave.start); if (date.getDay() == 0 || date.getDay() == 6) $scope.newLeave.start = ''; else $scope.setEndDate();
    });
    $scope.$watch('eReq.start', function (n) {
        if (!n || !$scope.eReq) return;
        var date = new Date($scope.eReq.start); if (date.getDay() == 0 || date.getDay() == 6) $scope.eReq.start = ''; else $scope.eEndDate();
    });
    $scope.$watch('newLeave.days', $scope.setEndDate);
    $scope.$watch('eReq.days',$scope.eEndDate);
    $scope.editLeave = function(req){
        $scope.eReq = angular.copy(req); $scope.eDays = req.days;
    };
    $scope.cancelLeaveEdit = function(){
        $scope.eReq = undefined; $scope.eDays = 0;
    };
    $scope.updateLeaveRequest = function(){
        $http.put('/vacation/pdupdate', $scope.eReq)
            .success(function (result) {
                if (result.success) {
                    if (result.message) Messages.showModalMessage(result.message, 'success');
                    $scope.eReq = undefined;
                    $scope.getEmps();
                }
                else {
                    if (result.errors.length > 0) {
                        result.errors.forEach(function (item) {
                            Messages.showModalMessage(item, 'danger');
                        });
                    }
                    if (result.errfor) {
                        var msg = '';
                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                    }
                }
            })
            .error(function (err) {
                if (err) Messages.showModalMessage(err, 'danger');
            });
    }
});
app.controller('setupCtrl', function ($scope, $http, $modal, Messages, globals, $location) {
    $scope.now = new Date();
    var path = $location.path().substr(7);
    $scope.getPeriod = function () {
        $http.get('/appraisal/current')
            .success(function (r) {
                globals.curentPeriod = r;
                $scope.period = r;
                var x = new Date(new Date(r.end).getTime() + 24 * 3600000);
                $scope.showNew = x <= Date.now();
            });
    };
    $scope.setDate = function (e, control) {
        e.preventDefault();
        e.stopPropagation();
        $scope[control] = true;
    };
    if (path == 'initiate') {
        $scope.appraisal = {};
        $scope.getPeriod();
        $scope.$watch('appraisal.end', function () {
            $scope.validateDate();
        });
        $scope.$watch('appraisal.start', function () {
            $scope.validateDate();
        });
        $scope.validateDate = function () {
            if ($scope.appraisal.start && $scope.appraisal.end && $scope.appraisal.start < $scope.appraisal.end)
                $scope.validDate = true; else $scope.validDate = false;
        };
        $scope.initiate = function () {
            if ($scope.appForm.$valid) {
                $scope.initiatingApp = true;
                $http.post('/appraisal/initiate', $scope.appraisal)
                    .success(function (res) {
                        if (res.success) {
                            if (res.message) Messages.showModalMessage(res.message, 'success');
                            $scope.appraisal = {};
                            $scope.getPeriod();
                        }
                        else {
                            if (res.errors.length > 0)
                                res.errors.forEach(function (item) {
                                    Messages.showModalMessage(item, 'danger');
                                });
                            if (res.errfor) {
                                var msg = '';
                                for (var p in res.errfor) msg += p + ':' + res.errfor[p] + ' ';
                                if (msg != '') Messages.showModalMessage(msg, 'danger');
                            }
                        }
                        $scope.initiatingApp = false;
                    })
                    .error(function (err) {
                        if (err && angular.isString(err)) Messages.showModalMessage(err, 'danger');
                        if (err) Messages.showModalMessage(err, 'danger');
                        $scope.initiatingApp = false;
                    })
            } else Messages.showMessage('Invalid data. Please correct and try again.')
        };
        $scope.extendApp = function () {
            $modal.open({
                backdrop: 'static',
                resolve: {
                    item: function () {
                        return $scope.period;
                    }
                },
                templateUrl: 'pages/linker.html',
                controller: function ($scope, $modalInstance, item) {
                    $scope.extApp = angular.copy(item);
                    $scope.now = new Date();
                    $scope.backText = 'Close';
                    $scope.back = function () {
                        $modalInstance.dismiss('Close');
                    };
                    $scope.extendApp = function (ans) {
                        if ($scope.form.$valid) {
                            $scope.extendingApp = true;
                            $http.post('/appraisal/extend', $scope.extApp)
                                .success(function (result) {
                                    $scope.extendingApp = false;
                                    if (result.success) {
                                        if (result.message) Messages.showMessage(result.message, 'success');
                                        $modalInstance.close();
                                    }
                                    else {
                                        if (result.errors.length > 0)
                                            result.errors.forEach(function (item) {
                                                Messages.showModalMessage(item, 'danger');
                                            });
                                        if (result.errfor) {
                                            var msg = '';
                                            for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                            if (msg != '') Messages.showModalMessage(msg, 'danger');
                                        }
                                    }
                                })
                                .error(function (err) {
                                    if (err && angular.isString(err)) Messages.showModalMessage(err, 'danger');
                                    else if (err && err.error) Messages.showModalMessage(err.error, 'danger');
                                    $scope.extendingApp = false;
                                });
                        }
                    };
                    $scope.setDate = function (e, control) {
                        e.preventDefault();
                        e.stopPropagation();
                        $scope[control] = true;
                    };
                }
            }).result.then(function () {
                $scope.getPeriod();
            });
        };
    }
    else if (path == 'kra') {
        $scope.modified = { area: {}, description: '', department: {}, designations: [] };
        $scope.showDesignations = function (item, area) {
            $modal.open({
                backdrop: 'static',
                templateUrl: 'pages/kra-area.html',
                controller: function ($scope, $modalInstance, item) {
                    $scope.kra = angular.copy(item);
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                },
                resolve: {
                    item: function () {
                        item.area = area;
                        return item;
                    }
                }
            });
        };
        $scope.getKraAs = function () {
            $http.get('/appraisal/kraareas')
                .success(function (r) {
                    globals.allKraAreas = r;
                    $scope.areas = r;
                    $scope.modified.area = r[0];
                });
        };
        $scope.editKra = function (kra, area) {
            $modal.open({
                backdrop: 'static',
                size: 'lg',
                templateUrl: 'pages/kra-edit.html',
                controller: function ($scope, $modalInstance, item, areas) {
                    $scope.areas = areas;
                    $scope.kraEdit = angular.copy(item);
                    //$scope.kraEdit.weight =$scope.kraEdit.weight || 1;
                    for (var i = 0; i < areas.length; i++) {
                        var itm = areas[i];
                        if (itm._id == item.area._id) { $scope.kraEdit.area = angular.copy(itm); break; }
                    }
                    if (item.department)
                        for (var i = 0; i < globals.constants.organisations.length; i++) {
                            var itm = globals.constants.organisations[i];
                            if (itm._id == item.department._id) { $scope.kraEdit.department = itm; break; }
                        }
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                    $scope.toggleEditSelection = function toggleSelection(desig) {
                        var i = $scope.kraEdit.designations.indexOf(desig);
                        if (i > -1) $scope.kraEdit.designations.splice(i, 1);
                        else $scope.kraEdit.designations.push(desig);
                    };
                    $scope.updateKra = function () {
                        $scope.updatingkra = true;
                        $scope.kraEdit.area.kras = [];
                        $http.post('/appraisal/savekra', $scope.kraEdit)
                            .success(function (result) {
                                if (result.success) {
                                    if (result.message) Messages.showMessage(result.message, 'success');
                                    $modalInstance.close({ action: 'create', data: result.item });
                                }
                                else {
                                    if (result.errors.length > 0)
                                        result.errors.forEach(function (item) { Messages.showModalMessage(item, 'danger'); });
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }
                                }
                                $scope.updatingkra = false;
                            })
                            .error(function (err) {
                                if (err) Messages.showModalMessage(err, 'danger');
                                $scope.updatingkra = false;
                            });
                    };
                },
                resolve: {
                    item: function () {
                        kra.area = area;
                        return kra;
                    }, areas: function () {
                        return $scope.areas;
                    }
                }
            }).result.then(function () {
                $scope.getKraAs();
            });
        };
        $scope.toggleSelection = function toggleSelection(desig) {
            var idx = $scope.modified.designations.indexOf(desig);
            // is currently selected
            if (idx > -1) $scope.modified.designations.splice(idx, 1);
                // is newly selected
            else $scope.modified.designations.push(desig);
        };
        $scope.getKraAs();
        $scope.addArea = function () {
            $modal.open({
                backdrop: 'static',
                template: '<div ng-controller="msgCtrl"><alert ng-cloak ng-repeat="a in modalAlerts" type="{{a.type}}" close="closeModalAlert($index);">{{a.text}}</alert> </div><div class="panel panel-default"><div class="panel-heading">New Area</div> <div class="panel-body"> <div class="padding"> <form class="form-horizontal" name="form"> <div class="form-group"> <label class="col-xs-3 control-label">Area:</label> <div class="col-xs-9"> <input ng-model="nwArea" type="text" class="form-control" placeholder="New Area Name" required /> </div> </div> <hr /> <div align="center"> <button type="button" class="btn btn-default" ng-disabled="!nwArea || nwArea.length < 5" ng-click="saveArea(nwArea)">Save Area</button> </div> </form> </div> </div> </div>',
                controller: function ($scope, $modalInstance) {
                    $scope.backText = 'Close';
                    $scope.back = function () {
                        $modalInstance.dismiss('Close');
                    };
                    $scope.saveArea = function (ans) {
                        if ($scope.form.$valid) {
                            $http.post('/appraisal/addarea', { name: ans })
                                .success(function (result) {
                                    if (result.success) {
                                        if (result.message) Messages.showMessage(result.message, 'success');
                                        $modalInstance.close({ action: 'create', data: result.item });
                                    }
                                    else {
                                        if (result.errors.length > 0)
                                            result.errors.forEach(function (item) {
                                                Messages.showModalMessage(item, 'danger');
                                            });
                                        if (result.errfor) {
                                            var msg = '';
                                            for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                            if (msg != '') Messages.showModalMessage(msg, 'danger');
                                        }
                                    }
                                })
                                .error(function (err) {
                                    if (err) Messages.showModalMessage(err, 'danger');
                                });
                        }
                    };
                }
            }).result.then(function () {
                $scope.getKraAs();
            });
        };
        $scope.saveKra = function () {
            $scope.savingkra = true;
            $http.post('/appraisal/savekra', $scope.modified)
                .success(function (result) {
                    $scope.savingkra = false;
                    if (result.success) {
                        if (result.message) Messages.showMessage(result.message, 'success');
                        $scope.modified.description = '';
                        $scope.resetDesigs();
                        $scope.getKraAs();
                    }
                    else {
                        if (result.errors.length > 0)
                            result.errors.forEach(function (item) {
                                Messages.showMessage(item, 'danger');
                            });
                        if (result.errfor) {
                            var msg = '';
                            for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                            if (msg != '') Messages.showMessage(msg, 'danger');
                        }
                    }
                })
                .error(function (err) {
                    if (err) Messages.showMessage(err, 'danger');
                    $scope.savingkra = false;
                });
        };
    }
    else if (path == 'scoring' || path == 'level') {
        $scope.getLevels = function () {
            $http.get('/appraisal/scoringp')
                .success(function (r) {
                    globals.scoreLevels = r;
                    $scope.scoreLevels = r;
                });
        }
        $scope.edit = function (item) {
            var itm = item == 'new' ? {} : item || {};
        }
        $scope.delete = function () {

        }
        $scope.getLevels();

    }
    else if (path == 'evaluation') {
        $scope.newEval = {};
        $scope.getEvaluationAreas = function () {
            $http.get('/appraisal/evaluation')
                .success(function (r) {
                    globals.evaluationAreas = r;
                    $scope.evaluationAreas = r;
                });
        };
        $scope.getEvaluationAreas();
        $scope.deleteEvaluation = function (item) {
            if (confirm("Are you sure you want to delete the question : " + item.question)) {
                item.delete = true; if (item._id == $scope.newEval) $scope.clearInput(); $scope.submitAction(item);
            }
        };
        $scope.editEvaluation = function (item) {
            $scope.newEval = angular.copy(item);
            $scope.isEdit = true;
        };
        $scope.clearInput = function () { $scope.newEval = { title: '', description: '' }; $scope.isEdit = false; };
        $scope.submitAction = function (item) {
            $http.post('/appraisal/evaluation', item)
                .success(function (result) {
                    if (result.success) {
                        if (result.message) Messages.showModalMessage(result.message, 'success');
                        if (!item.delete) $scope.clearInput();
                        $scope.getEvaluationAreas();
                    }
                    else {
                        if (result.errors.length > 0)
                            result.errors.forEach(function (item) {
                                Messages.showModalMessage(item, 'danger');
                            });
                        if (result.errfor) {
                            var msg = '';
                            for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                            if (msg != '') Messages.showModalMessage(msg, 'danger');
                        }
                    }
                })
                .error(function (er) {
                    if (er && angular.isString(er)) Messages.showModalMessage(er, 'danger');
                    else if (er && er.error) Messages.showModalMessage(er.error, 'danger');
                });
        }
    }
    else if (path == 'competence') {
        $scope.newQuestion = {}; $scope.newCategory = {};
        $scope.getPerformanceCompetences = function () {
            $http.get('/appraisal/competence')
                .success(function (r) {
                    globals.competenceCats = r.data;
                    $scope.competenceCats = r.data;
                    globals.competenceCatsWithQuest = r.sub;
                    $scope.competenceCatsWithQuest = r.sub;
                });
        };
        $scope.getPerformanceCompetences();
        $scope.ShowContextMenu = function () {

        };
        $scope.catMenu = [
            ['edit category', function ($itemScope) {
                $scope.editCompetenceItem(false, $itemScope.cat);
            }],
            null,
            ['delete category', function ($itemScope) {
                $scope.deleteCompetenceItem(false, $itemScope.cat);
            }]
        ];
        $scope.subMenu = [
            ['edit sub-category', function ($itemScope) {
                globals.competenceCats.forEach(function (item) {
                    if (item._id == $itemScope.quest.category)
                        $itemScope.quest.category = item;
                });
                $scope.editCompetenceItem(true, $itemScope.quest);
            }],
            null,
            ['delete sub-category', function ($itemScope) {
                $scope.deleteCompetenceItem(true, $itemScope.quest);
            }]
        ];
        $scope.editCompetenceItem = function (isQ, item) {
            isQ ? $scope.newQuestion = angular.copy(item) : $scope.newCategory = angular.copy(item);
            isQ ? $scope.isQuestEdit = true : $scope.isCatEdit = true;
        };
        $scope.deleteCompetenceItem = function (isQ, item) {
            if (confirm("Are you sure you want to delete this "
                    + (isQ ? 'question' : 'category') + " : "
                    + item[isQ ? 'name' : 'header'])) {
                item.delete = true;
                if (isQ && item._id == $scope.newQuestion._id) $scope.clearInput(isQ);
                if (!isQ && item._id == $scope.newCategory._id) $scope.clearInput(isQ);
                $scope.submitAction(isQ, item);
            }
        };

        $scope.addCategory = function () {

        };
        $scope.getDefault = function (dept, obj) {
            if (angular.isObject(obj.filter[dept])) return obj.weight;
            else if (angular.isNumber(obj.filter[dept])) return obj.filter[dept];
            else return obj.weight;
        };
        $scope.getQDefault = function (dept, obj) {
            if (angular.isObject(obj.filter[dept])) return obj.weight || obj.category.weight || 0;
            else if (angular.isNumber(obj.filter[dept])) return obj.filter[dept];
            else return obj.weight;
        };
        $scope.hasSubs = function (item) { return angular.isObject(item); };
        $scope.deleteFilter = function (des, item) {
            delete item[des];
        }
        $scope.addFilter = function (type) {
            $scope.type = type ? type : 'Category';
            $scope.item =
                type == 'Category' ? $scope.newCategory : type == 'Question'
                    ? $scope.newQuestion : {};
            $scope.item.weight = $scope.item.weight || 1;
            $modal.open({
                backdrop: 'static',
                templateUrl: 'pages/weight-filter.html',
                controller: ['$scope', 'type', 'item', '$modalInstance', function ($scope, type, item, $modalInstance) {
                    $scope.type = type; $scope.desigs = []; $scope.depts = []; $scope.deptDesigs = {};
                    $scope.updateSingleFilter = function (dept) {
                        if (!item.filter) {
                            item.filter = {};
                            if ($scope.deptDesigs[dept.name].length > 0) {
                                item.filter[dept.name] = {};
                                angular.forEach($scope.deptDesigs[dept.name], function (i) {
                                    item.filter[dept.name][i] = $scope.weight;
                                });
                            } else item.filter[dept.name] = $scope.weight;
                        } else if (!item.filter[dept.name]) {
                            if ($scope.deptDesigs[dept.name].length > 0) {
                                item.filter[dept.name] = {};
                                angular.forEach($scope.deptDesigs[dept.name], function (i) {
                                    item.filter[dept.name][i] = $scope.weight;
                                });
                            } else item.filter[dept.name] = $scope.weight;
                        } else {
                            if ($scope.deptDesigs[dept.name].length > 0) {
                                if (angular.isNumber(item.filter[dept.name])) {
                                    var num = item.filter[dept.name];
                                    item.filter[dept.name] = {};
                                    angular.forEach(dept.designations, function (value) {
                                        item.filter[dept.name][value] = num;
                                    });
                                }
                                angular.forEach($scope.deptDesigs[dept.name], function (i) {
                                    item.filter[dept.name][i] = $scope.weight;
                                });
                            }
                            else item.filter[dept.name] = $scope.weight;
                        }
                    };
                    $scope.updateFilter = function(){
                        angular.forEach($scope.depts, function(i){$scope.updateSingleFilter(i);});
                        $modalInstance.close({ item: item });
                    };
                    $scope.updateFilter2 = function () {
                        if (!item.filter) {
                            item.filter = {};
                            if ($scope.desigs.length > 0) {
                                item.filter[$scope.dept.name] = {};
                                angular.forEach($scope.desigs, function (i) {
                                    item.filter[$scope.dept.name][i] = $scope.weight;
                                });
                            } else item.filter[$scope.dept.name] = $scope.weight;
                        } else if (!item.filter[$scope.dept.name]) {
                            if ($scope.desigs.length > 0) {
                                item.filter[$scope.dept.name] = {};
                                angular.forEach($scope.desigs, function (i) {
                                    item.filter[$scope.dept.name][i] = $scope.weight;
                                });
                            } else item.filter[$scope.dept.name] = $scope.weight;
                        } else {
                            if ($scope.desigs.length > 0) {
                                if (angular.isNumber(item.filter[$scope.dept.name])) {
                                    var num = item.filter[$scope.dept.name];
                                    item.filter[$scope.dept.name] = {};
                                    angular.forEach($scope.dept.designations, function (value, key) {
                                        item.filter[$scope.dept.name][value] = num;
                                    });
                                }
                                angular.forEach($scope.desigs, function (i) {
                                    item.filter[$scope.dept.name][i] = $scope.weight;
                                });
                            }
                            else item.filter[$scope.dept.name] = $scope.weight;
                        }
                        $modalInstance.close({ item: item });
                    };
                    $scope.toggleDesig = function (i, d) {
                        if($scope.deptDesigs[d]){
                            var idx = $scope.deptDesigs[d].indexOf(i);
                            if (idx > -1) $scope.deptDesigs[d].splice(idx, 1);
                            else $scope.deptDesigs[d].push(i);
                        }
                    };
                    $scope.toggleFilter = function (i) {
                        var idx = $scope.desigs.indexOf(i);
                        if (idx > -1) $scope.desigs.splice(idx, 1);
                        else $scope.desigs.push(i);
                    };
                    $scope.toggleDept = function(i){
                        var idx = $scope.depts.indexOf(i);
                        if (idx > -1){
                            $scope.depts.splice(idx, 1);
                            delete $scope.deptDesigs[i.name];
                        }
                        else {
                            $scope.depts.push(i);
                            $scope.deptDesigs[i.name] = [];
                        }
                    };
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                }],
                resolve: {
                    item: function () {
                        return $scope.item;
                    }, type: function () {
                        return type;
                    }
                }
            }).result.then(function (item) { });
        };
        $scope.clearInput = function (isQ) {
            isQ ? $scope.newQuestion = { name: '', description: '' }
                : $scope.newCategory = { header: '' };
            isQ ? $scope.isQuestEdit = false
                : $scope.isCatEdit = false;
        };
        $scope.submitAction = function (isQ, item) {
            //$http.post('/appraisal/competence'+ isQ?'':'a', item)
            var t = isQ ? '' : 'a';
            $http.post('/appraisal/competence' + t, item)
                .success(function (result) {
                    if (result.success) {
                        if (result.message) Messages.showModalMessage(result.message, 'success');
                        if (!item.delete) $scope.clearInput(isQ);
                        $scope.getPerformanceCompetences();
                    }
                    else {
                        if (result.errors.length > 0)
                            result.errors.forEach(function (item) {
                                Messages.showModalMessage(item, 'danger');
                            });
                        if (result.errfor) {
                            var msg = '';
                            for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                            if (msg != '') Messages.showModalMessage(msg, 'danger');
                        }
                    }
                })
                .error(function (er) {
                    if (er && angular.isString(er)) Messages.showModalMessage(er, 'danger');
                    else if (er && er.error) Messages.showModalMessage(er.error, 'danger');
                });
        }
    }
    else if (path == 'assessment') {
        $scope.newAssess = {};
        $scope.getAssessmentsQ = function () {
            $http.get('/appraisal/assessment')
                .success(function (r) {
                    globals.assessmentQs = r;
                    $scope.assessmentQs = r;
                });
        };
        $scope.getAssessmentsQ();
        $scope.deleteAssessment = function (item) {
            if (confirm("Are you sure you want to delete this question : " + item.question)) {
                item.delete = true; if (item._id == $scope.newAssess_id) $scope.clearInput(); $scope.submitAction(item);
            }
        };
        $scope.editAssessment = function (item) {
            $scope.newAssess = angular.copy(item);
            $scope.isEdit = true;
        };
        $scope.clearInput = function () { $scope.newAssess = { question: '', isCancel: false }; $scope.isEdit = false; };
        $scope.submitAction = function (item) {
            $http.post('/appraisal/assessment', item)
                .success(function (result) {
                    if (result.success) {
                        if (result.message) Messages.showModalMessage(result.message, 'success');
                        if (!item.delete) $scope.clearInput();
                        $scope.getAssessmentsQ();
                    }
                    else {
                        if (result.errors.length > 0)
                            result.errors.forEach(function (item) {
                                Messages.showModalMessage(item, 'danger');
                            });
                        if (result.errfor) {
                            var msg = '';
                            for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                            if (msg != '') Messages.showModalMessage(msg, 'danger');
                        }
                    }
                })
                .error(function (er) {
                    if (er && angular.isString(er)) Messages.showModalMessage(er, 'danger');
                    else if (er && er.error) Messages.showModalMessage(er.error, 'danger');
                });
        }
    }
    else if (path == 'confirmation') {
        $scope.previewCon = function () {

        };
        $scope.getDepts = function (depts) {
            if (angular.isArray(depts)) {
                if ((globals.constants.organisations || []).length == depts.length)
                    return 'All Departments';
                else return depts.map(function (o) { return o.name; }).toString();
            }
        }
        $scope.newEval = { departments: [] };
        $scope.getEvaluationAreas = function () {
            $http.get('/appraisal/confirmation')
                .success(function (r) { $scope.confirmationAreas = r; });
        };
        $scope.getEvaluationAreas();
        $scope.deleteEvaluation = function (item) {
            if (confirm("Are you sure you want to delete this evaluation area : " + item.area + '?')) {
                item.delete = true; if (item._id == $scope.newEval) $scope.clearInput(); $scope.submitArea(item);
            }
        };
        $scope.selectAll = function () { $scope.newEval.departments = (globals.constants.organisations || []).map(function (o) { return o._id; }); }
        $scope.editEvaluation = function (item) {
            $scope.newEval = angular.copy(item);
            $scope.newEval.departments = ($scope.newEval.departments || []).map(function (o) { return o._id; });
            $scope.isEdit = true;
        };
        $scope.clearInput = function () { $scope.newEval = { area: '', header: '', departments: [] }; $scope.isEdit = false; };
        $scope.toggleSelection = function (id) {
            var i = $scope.newEval.departments.indexOf(id);
            if (i > -1) $scope.newEval.departments.splice(i, 1);
            else $scope.newEval.departments.push(id);
        }
        $scope.submitArea = function (item) {
            $http.post('/appraisal/confirmation', item)
                .success(function (result) {
                    if (result.success) {
                        if (result.message) Messages.showModalMessage(result.message, 'success');
                        if (!item.delete) $scope.clearInput();
                        $scope.getEvaluationAreas();
                    }
                    else {
                        if ((result.errors || []).length > 0)
                            result.errors.forEach(function (item) {
                                Messages.showModalMessage(item, 'danger');
                            });
                        if (result.errfor) {
                            var msg = '';
                            for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                            if (msg != '') Messages.showModalMessage(msg, 'danger');
                        }
                    }
                })
                .error(function (er) {
                    if (er && angular.isString(er)) Messages.showModalMessage(er, 'danger');
                    else if (er && er.error) Messages.showModalMessage(er.error, 'danger');
                });
        }

    }
    else if (path == 'iconfirmation') {
        $scope.getUnconfirmedEmps = function () {
            $http.get('/appraisal/unconfirmed')
                .success(function (result) {
                    $scope.unconfirmed = result.unconfirmed; $scope.initiated = result.initiated;
                    $scope.employees = result.emps;
                });
        };
        $scope.startIni = function () {
            $modal.open({
                backdrop: 'static',
                templateUrl: 'pages/confirmation-new.html',
                controller: function ($scope, $modalInstance, a, b) {
                    $scope.selectEmp = { appraisers: [] };
                    $scope.unconfirmed = angular.copy(b); $scope.employees = a;
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                    $scope.toggleSelection = function (id) {
                        var i = $scope.selectEmp.appraisers.indexOf(id);
                        if (i > -1) $scope.selectEmp.appraisers.splice(i, 1);
                        else $scope.selectEmp.appraisers.push(id);
                    }
                    $scope.$watch('selectEmp', function (n, o) {
                        if (!n) return; n.appraisers = [];
                    });
                    $scope.initiateCon = function () {
                        $scope.savingCon = true;
                        $http.post('/appraisal/initiateconfirmation', $scope.selectEmp)
                            .success(function (result) {
                                if (result.success) {
                                    if (result.message) Messages.showMessage(result.message, 'success');
                                    $modalInstance.close({});
                                }
                                else {
                                    if ((result.errors || []).length > 0)
                                        result.errors.forEach(function (item) {
                                            Messages.showModalMessage(item, 'danger');
                                        });
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }
                                }
                                $scope.savingCon = false;
                            })
                            .error(function (er) {
                                if (er && angular.isString(er)) Messages.showModalMessage(er, 'danger');
                                else if (er && er.error) Messages.showModalMessage(er.error, 'danger');
                            });
                    }
                }, resolve: {
                    a: function () { return $scope.employees; },
                    b: function () { return $scope.unconfirmed; }
                }
            }).result.then(function (item) { $scope.getUnconfirmedEmps(); });
        }
        $scope.getUnconfirmedEmps();
    }
    else if (path == 'delegationlist') {
        $scope.getDelegated = function () {
            $http.get('/admin/tsk')
                .success(function (result) {
                    $scope.delegations = result.delegations; $scope.employees = result.emps;
                    $scope.delTasks = result.delTasks; $scope.newDel = { tasks: [] };
                });
        };

        $scope.toggleSelection = function (id) {
            var idx = $scope.newDel.tasks.indexOf(id);
            if (idx > -1) $scope.newDel.tasks.splice(idx, 1);
            else $scope.newDel.tasks.push(id);
        }
        $scope.getDelegated();
        $scope.$watch('newDel.employee', function (n, o) {
            if (!n) return; else $scope.newDel.tasks = $scope.newDel.employee.tasks;
        });
        $scope.viewDelegation = function (t) {
            $modal.open({
                backdrop: 'static',
                templateUrl: 'pages/delegation-details.html',
                controller: function ($scope, $modalInstance, a, b) {
                    $scope.tsk = angular.copy(a);
                    $scope.delTasks = angular.copy(b);
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                    var proceed = function (tsk) {
                        $http.put('/admin/tsk', tsk)
                            .success(function (result) {
                                if (result.message) Messages.showMessage(result.message, result.success ? 'success' : 'danger');
                                if (result.success) $modalInstance.close({});
                                else {
                                    if ((result.errors || []).length > 0)
                                        result.errors.forEach(function (item) {
                                            Messages.showModalMessage(item, 'danger');
                                        });
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }
                                }
                            })
                            .error(function (er) {
                                if (er && angular.isString(er)) Messages.showModalMessage(er, 'danger');
                                else if (er && er.error) Messages.showModalMessage(er.error, 'danger');
                            })
                    }
                    $scope.updateTsk = function (status) {
                        proceed($scope.tsk);
                    };
                    $scope.deactivateTsk = function () {
                        $scope.tsk.status = 'Stopped';
                        proceed($scope.tsk);
                    };
                    $scope.activateTsk = function () {
                        $scope.tsk.status = 'Active';
                        proceed($scope.tsk);
                    };
                    $scope.toggleSelection = function (id) {
                        var idx = $scope.tsk.tasks.indexOf(id);
                        if (idx > -1) $scope.tsk.tasks.splice(idx, 1);
                        else $scope.tsk.tasks.push(id);
                    }
                }, resolve: {
                    a: function () { return t; },
                    b: function () { return $scope.delTasks; }
                }
            }).result.then(function () { $scope.getDelegated(); });;
        }
        $scope.assignTask = function () {
            $http.post('/admin/tsk', $scope.newDel)
                .success(function (result) {
                    if (result.message) Messages.showMessage(result.message, result.success ? 'success' : 'danger');
                    if (result.success) $scope.getDelegated();
                    else {
                        if ((result.errors || []).length > 0)
                            result.errors.forEach(function (item) {
                                Messages.showMessage(item, 'danger');
                            });
                        if (result.errfor) {
                            var msg = '';
                            for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                            if (msg != '') Messages.showMessage(msg, 'danger');
                        }
                    }
                })
                .error(function (er) {
                    if (er && angular.isString(er)) Messages.showMessage(er, 'danger');
                    else if (er && er.error) Messages.showMessage(er.error, 'danger');
                });
        }
    }
});
app.controller('appraisalCtrl', function ($scope, $http, $modal, Messages, globals, $location) {
    $scope.getPeriod = function () {
        $http.get('/appraisal/current')
            .success(function (r) {
                globals.curentPeriod = r;
                $scope.period = r;
                var x = new Date(new Date(r.end) + 120 + 3600000);
                $scope.showNew = x >= Date.now;
            })
            .error(function () {

            });
    };
    var error = {
        assessment: 'Assessment not completed',
        confirmation: 'Confirmation not yet completed'
    }
    $scope.showError = function (e) {
        Messages.showMessage(error[e]);
    }
    $scope.showDetails = function (item, emp) {
        var name = $scope.itemPath.slice(0, $scope.itemPath.length - 1);
        $modal.open({
            backdrop: 'static',
            size: 'lg',
            resolve: { item: function () { return item; }, name: function () { return name; }, emp: function () { return emp; } },
            templateUrl: 'pages/appraisal-' + name + '-details.html',
            controller: ['$scope', '$modalInstance', 'item', 'name', 'emp', '$filter',function ($scope, $modalInstance, item, name, emp, $filter) {
                $scope.data = angular.copy(item); $scope.now = new Date();
                if (emp) $scope.data.employee = emp;

                $scope.backText = 'Close';
                $scope.back = function () { $modalInstance.dismiss('Close'); };
                $scope.reArrange = function (app) {
                    var d = {};
                    angular.forEach(app.list, function (p, i) {
                        if (!d[p.details.area])
                            d[p.details.area] = [];
                        d[p.details.area].push(p);
                    });
                    $scope.keys = d;
                }
                $scope.reArrangeComp = function (app) {
                    var d = {};
                    angular.forEach(app.list, function (p, i) {
                        if (!d[p.details.category])
                            d[p.details.category] = [];
                        d[p.details.category].push(p);
                    });
                    $scope.keys = d;
                }
                $scope.getPeriodName = function (p) { return p.name + ' ' + p.year; }
            }]
        });
    };
    $scope.$watch('sel', function (n, o) {
        $scope.gready = false;
        if (!n) return;
        var p = []; var labels = []; var data = [];
        angular.forEach(n.periods, function (n) {
            var period = {
                name: n.period.name + ' ' + n.period.year,
                year: n.period.year,
                score: n.data[0].score,
                text: n.data[0].text
            };
            labels.push(period.name);
            p.push(period);
        });
        data.push(p.map(function (r) { return r.score; }));
        $scope.labels = labels;
        $scope.chartData = data;
    });
    $scope.reOrder = function (m, n) {
    }
    switch ($location.path()) {
        case '/hrassessment':
            $scope.itemPath = 'assessments';
            break;
        case '/hrappraisal':
            $scope.itemPath = 'kraappraisals';
            break;
        case '/hrcompetence':
            $scope.itemPath = 'competences';
            break;
        case '/hrevaluation':
            $scope.itemPath = 'evaluations';
            break;
        case '/hrperformance':
            $scope.itemPath = 'performances';
            break;
        case '/hrappraisalsum':
            $scope.itemPath = 'krasums';
            break;
        case '/hrconfirmation':
            $scope.itemPath = 'confirmations';
            break;
        case '/hrdiscipline': $scope.itemPath = 'disciplines'; break;
        default:
            break;
    }
    if ($scope.itemPath) {
        $scope['get' + $scope.itemPath] = function () {
            $http.get('/appraisal/' + $scope.itemPath)
                .success(function (r) {
                    globals[$scope.itemPath] = r; $scope[$scope.itemPath] = r;
                    if ($scope.itemPath == 'performances' || $scope.itemPath == 'confirmations') {
                        globals.gseries = ['KRA History'];
                        $scope.sel = r[0];
                    }
                    $scope.data = r
                }).error(function (err) { if (angular.isString(err)) Messages.showMessage(err); });
        };
        $scope['get' + $scope.itemPath]();
    }
});
app.controller('kraCtrl', function ($scope, $http, $modal, Messages, globals) {
    $scope.modified = {
        area: {},
        description: '',
        designations: [],
        chosen: {}
    };
    $scope.getOrgs = function () {

    }
    $scope.showDesignations = function (item, area) {
        $modal.open({
            backdrop: 'static',
            templateUrl: 'pages/kra-area.html',
            controller: function ($scope, $modalInstance, item) {
                $scope.kra = angular.copy(item);
                $scope.back = function () { $modalInstance.dismiss('Close'); };
            },
            resolve: { item: function () { item.area = area; return item; } }
        });
    };
    $scope.resetDesigs = function () {
        globals.constants.designations.forEach(function (item) {
            $scope.modified.chosen[item] = false;
        })
    };
    $scope.getKraAs = function () {
        $http.get('/employee/kraareas')
            .success(function (r) {
                globals.allKraAreas = r; $scope.areas = r; $scope.resetDesigs(); $scope.modified.area = r[0];
            });
    };
    $scope.editKra = function (kra, area) {
        $modal.open({
            backdrop: 'static',
            size: 'lg',
            templateUrl: 'pages/kra-edit.html',
            controller: function ($scope, $modalInstance, item, areas, globals) {
                $scope.areas = areas;
                $scope.modified = {
                    area: angular.copy(item.area),
                    _id: item._id,
                    description: item.description,
                    designations: item.designations,
                    chosen: {},
                    removed: {}
                };
                $scope.included = []; $scope.excluded = [];
                globals.constants.designations.forEach(function (itm) {
                    if (item.designations.indexOf(itm) == -1) {
                        $scope.included.push(itm);
                        $scope.modified.chosen[itm] = false;
                    }
                    else {
                        $scope.excluded.push(itm);
                        $scope.modified.removed[itm] = false;
                    }
                });
                $scope.back = function () { $modalInstance.dismiss('Close'); };
                $scope.updateKra = function () {
                    $scope.updatingkra = true; $scope.modified.area.kras = [];
                    $http.post('/employee/savekra', $scope.modified)
                        .success(function (result) {
                            if (result.success) {
                                if (result.message) Messages.showMessage(result.message, 'success');
                                $modalInstance.close({ action: 'create', data: result.item });
                            }
                            else {
                                if (result.errors.length > 0)
                                    result.errors.forEach(function (item) {
                                        Messages.showModalMessage(item, 'danger');
                                    });
                                if (result.errfor) {
                                    var msg = '';
                                    for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                    if (msg != '') Messages.showModalMessage(msg, 'danger');
                                }
                            }
                            $scope.updatingkra = false;
                        })
                        .error(function (err) {
                            if (err) Messages.showModalMessage(err, 'danger'); $scope.updatingkra = false;
                        });
                };
                $scope.checkedChanged = function (desig) {
                    if ($scope.modified.chosen[desig] && $scope.modified.designations.indexOf(desig) == -1)
                        $scope.modified.designations.push(desig);
                    else if (!$scope.modified.chosen[desig]) {
                        var i = $scope.modified.designations.indexOf(desig);
                        if (i >= 0) $scope.modified.designations.splice(i, 1);
                    }
                };
                $scope.checkedRChanged = function (desig) {
                    if ($scope.modified.removed[desig]) {
                        var i = $scope.modified.designations.indexOf(desig);
                        if (i >= 0) $scope.modified.designations.splice(i, 1);
                    }
                    else if (!$scope.modified.removed[desig] && $scope.modified.designations.indexOf(desig) == -1) {
                        $scope.modified.designations.push(desig);
                    }
                };
            },
            resolve: { item: function () { kra.area = area; return kra; }, areas: function () { return $scope.areas; } }
        }).result.then(function () { $scope.getKraAs(); });
    };
    $scope.getKraAs();
    $scope.addArea = function () {
        $modal.open({
            backdrop: 'static',
            template: '<div ng-controller="msgCtrl"><alert ng-cloak ng-repeat="a in modalAlerts" type="{{a.type}}" close="closeModalAlert($index);">{{a.text}}</alert> </div><div class="panel panel-default"><div class="panel-heading">New Area</div> <div class="panel-body"> <div class="padding"> <form class="form-horizontal" name="form"> <div class="form-group"> <label class="col-xs-3 control-label">Area:</label> <div class="col-xs-9"> <input ng-model="nwArea" type="text" class="form-control" placeholder="New Area Name" required /> </div> </div> <hr /> <div align="center"> <button type="button" class="btn btn-default" ng-disabled="!nwArea || nwArea.length < 5" ng-click="saveArea(nwArea)">Save Area</button> </div> </form> </div> </div> </div>',
            controller: function ($scope, $modalInstance) {
                $scope.backText = 'Close';
                $scope.back = function () { $modalInstance.dismiss('Close'); };
                $scope.saveArea = function (ans) {
                    if ($scope.form.$valid) {
                        $http.post('/employee/addarea', { name: ans })
                            .success(function (result) {
                                if (result.success) {
                                    if (result.message) Messages.showMessage(result.message, 'success');
                                    $modalInstance.close({ action: 'create', data: result.item });
                                }
                                else {
                                    if (result.errors.length > 0)
                                        result.errors.forEach(function (item) {
                                            Messages.showModalMessage(item, 'danger');
                                        });
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }
                                }
                            })
                            .error(function (err) {
                                if (err) Messages.showModalMessage(err, 'danger');
                            });
                    }
                };
            }
        }).result.then(function () { $scope.getKraAs(); });
    }
    $scope.checkedChanged = function (desig) {
        if ($scope.modified.chosen[desig] && $scope.modified.designations.indexOf(desig) == -1)
            $scope.modified.designations.push(desig);
        else if (!$scope.modified.chosen[desig]) {
            var i = $scope.modified.designations.indexOf(desig);
            if (i >= 0) $scope.modified.designations.splice(i, 1);
        }
    };
    $scope.saveKra = function () {
        $scope.savingkra = true;
        $http.post('/employee/savekra', $scope.modified)
            .success(function (result) {
                $scope.savingkra = false;
                if (result.success) {
                    if (result.message) Messages.showMessage(result.message, 'success');
                    $scope.modified.description = ''; $scope.resetDesigs();
                    $scope.getKraAs();
                }
                else {
                    if (result.errors.length > 0)
                        result.errors.forEach(function (item) {
                            Messages.showMessage(item, 'danger');
                        });
                    if (result.errfor) {
                        var msg = '';
                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                        if (msg != '') Messages.showMessage(msg, 'danger');
                    }
                }
            })
            .error(function (err) {
                if (err) Messages.showMessage(err, 'danger'); $scope.savingkra = false;
            });
    }
});
app.controller('testCtrl', function ($scope, $compile, uiCalendarConfig, globals, $http) {
    $scope.getEvts = function (a, b, c, cb) {
        $http.get('/employee/allEvents')
            .success(function (result) {
                globals.events = result;
                cb(result);
            });
    };
    $scope.getEvs = function (a, b, c, cb) {
        $http.get('/employee/allEvents')
            .success(function (result) {
                globals.events = result;
                $scope.eventSources.splice(0, $scope.eventSources.length);
                $scope.eventSources.push(result);
            });
    };
    $scope.getEvs();
    $scope.newSource = {
        url: "/employee/allEvents"
    }
    $scope.eventRender = function (event, element, view) {
        element.attr({
            'tooltip': event.title,
            'tooltip-append-to-body': true
        });
        $compile(element)($scope);
    };
    $scope.uiConfig = {
        calendar: {
            height: 550,
            editable: true,
            header: {
                left: 'title',
                center: '',
                right: 'today prev,next'
            },
            weekends: false,
            eventRender: $scope.eventRender
        }
    };
    $scope.evs = [];
    $scope.eventSources = [];
    //$scope.eventSources = [$scope.getEvts];
});
app.controller('appraiseCtrl', function ($scope, $http, $modal, Messages, globals, $location) {
    var path = $location.path().substr(1);
    var loading = $modal.open({
        backdrop: 'static',
        template: 'loading'
    });
    if (path == 'assessment') {
        $scope.getQuestions = function () {
            $http.get('/appraisaldata/assessment')
                .success(function (r) {
                    $scope.selfAssR = r;
                    loading.close('dismiss');
                    $scope.lax = true;
                }).error(function (err) {
                    loading.close('dismiss');
                    Messages.showModalMessage(angular.isString(err) ? err : 'Could not retrieve the self assessment data', 'danger');
                });
        }
        $scope.getQuestions();
        $scope.submitAction = function () {
            $http.post('/appraisaldata/assessment', $scope.selfAssR.assessments)
                .success(function (result) {
                    if (result.success) {
                        if (result.message) Messages.showModalMessage(result.message, 'success');
                        $scope.getQuestions();
                    }
                    else {
                        if (result.errors.length > 0)
                            result.errors.forEach(function (item) {
                                Messages.showModalMessage(item, 'danger');
                            });
                        if (result.errfor) {
                            var msg = '';
                            for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                            if (msg != '') Messages.showModalMessage(msg, 'danger');
                        }
                    }
                }).error(function (err) {
                    loading.close('dismiss');
                    Messages.showModalMessage(angular.isString(err) ? err : 'Could not retrieve the self assessment data', 'danger');
                });
        }
        $scope.isCareerChanged = function (ax) { var e = []; for (var p in ax.answers) { e.push(ax.answers[p]); } ax.answer = e.join(":$:"); }
    }
    else if (path == 'appraisal') {
        $scope.getAppraisals = function () {
            $http.get('/appraisaldata/appraisal')
                .success(function (r) {
                    if (r.appraised) {
                        $scope.appraisalR = r;
                        loading.close('dismiss');
                    } else {
                        var col = [];
                        for (var p in r.kras) { col.push(p) };
                        $scope.appraisalR = r;
                        $scope.appraisalA = col;
                        $scope.appraisalQ = r.kras;
                        loading.close('dismiss');
                    }
                    $scope.lax = true;
                }).error(function (err) {
                    loading.close('dismiss');
                    Messages.showMessage(angular.isString(err) ? err : 'Could not retrieve the self assessment data', 'danger');
                });
        };
        $scope.editArch = function (ach) {
            $modal.open({
                backdrop: 'static',
                templateUrl: 'pages/edit-achievement.html',
                controller: function ($scope, Messages, $http, achievement, $modalInstance) {
                    $scope.achEdit = angular.copy(achievement);
                    $scope.saveA = function () {
                        $http.post('/appraisaldata/achievement', $scope.achEdit)
                            .success(function (result) {
                                if (result.success) {
                                    if (result.message) Messages.showModalMessage(result.message, 'success');
                                    $modalInstance.close({ action: 'create', data: result.item });
                                }
                                else {
                                    if (result.errors.length > 0)
                                        result.errors.forEach(function (item) {
                                            Messages.showModalMessage(item, 'danger');
                                        });
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }
                                }
                            }).error(function (err) {
                                loading.close('dismiss');
                                Messages.showModalMessage(angular.isString(err) ? err : 'Could not retrieve the self assessment data', 'danger');
                            });
                    };
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                },
                resolve: { achievement: function () { return ach; } }
            }).result.then(function () { $scope.getAppraisals(); });
        }
        $scope.getAppraisals();
        $scope.submitAction = function () {
            $http.post('/appraisaldata/appraisal', $scope.selfAssR.assessments)
                .success(function (result) {
                    if (result.success) {
                        if (result.message) Messages.showModalMessage(result.message, 'success');
                        $scope.getAppraisals();
                    }
                    else {
                        if (result.errors.length > 0)
                            result.errors.forEach(function (item) {
                                Messages.showModalMessage(item, 'danger');
                            });
                        if (result.errfor) {
                            var msg = '';
                            for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                            if (msg != '') Messages.showModalMessage(msg, 'danger');
                        }
                    }
                }).error(function (err) {
                    loading.close('dismiss');
                    Messages.showModalMessage(angular.isString(err) ? err : 'Could not retrieve the self assessment data', 'danger');
                });
        }
    }
    else if (path == 'competence') {
        $scope.getCompetenceReport = function () {
            $http.get('/appraisaldata/competence')
                .success(function (r) {
                    if (r.appraised) {

                    } else {
                        var col = [];
                        for (var p in r.kras) { col.push(p) };
                        //r.competences.forEach(function (itm, m) {
                        //    r.cats.forEach(function (it, t) {
                        //        if (it._id == itm.question.category._id)
                        //            r.cats[t].questions.push(itm);
                        //    });
                        //});
                        //    $scope.appraisalR = r;
                        $scope.compCat = col;
                        $scope.compQ = r;
                        //    $scope.appraisalQ = r.kras;
                        loading.close('dismiss');
                    }
                    //$scope.lax = true;
                }).error(function (err) {
                    loading.close('dismiss');
                    Messages.showMessage(angular.isString(err) ? err : 'Could not retrieve the self assessment data', 'danger');
                });
        }
        $scope.getCompetenceReport();
    }
    else if (path == 'subfeedback') {
        loading.close('dismiss');
        $scope.getEvaluations = function () {
            $http.get('/appraisaldata/subevaluations')
                .success(function (r) {
                    if (angular.isArray($scope.evaluations) && $scope.evaluations) {

                    }
                    $scope.evaluations = r.evaluations;
                    $scope.evalAreas = r.evalAreas;
                    loading.close('dismiss');
                }).error(function (err) {
                    loading.close('dismiss');
                    Messages.showMessage(angular.isString(err) ? err : 'Could not retrieve the self assessment data', 'danger');
                });
        }
        $scope.getEvaluations();
    }
    else if (path == 'evaluatesup') {
        loading.close('dismiss');
        $scope.getEvaluations = function () {
            $http.get('/appraisaldata/evaluatesup')
                .success(function (r) {
                    $scope.eval = r; $scope.lax = true;
                    if (r.isOpen && !r.appraised) {
                        $scope.evaluateSup = function () {
                            $scope.savingAch = true;
                            $http.post('/appraisaldata/evaluatesup', $scope.eval.evaluations)
                                .success(function (result) {
                                    if (result.success) {
                                        if (result.message) Messages.showMessage(result.message, 'success');
                                        $scope.eval = result.item;
                                        //$scope.getEvaluations();
                                    }
                                    else {
                                        if (result.errors.length > 0)
                                            result.errors.forEach(function (item) {
                                                Messages.showModalMessage(item, 'danger');
                                            });
                                        if (result.errfor) {
                                            var msg = '';
                                            for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                            if (msg != '') Messages.showModalMessage(msg, 'danger');
                                        }
                                    }
                                    $scope.savingAch = false;
                                })
                                .error(function (err) {
                                    if (err) Messages.showModalMessage(err, 'danger'); $scope.savingAch = false;
                                });
                        }
                    }
                    loading.close('dismiss');
                }).error(function (err) {
                    loading.close('dismiss');
                    $scope.eval = err;;
                });
        };
        $scope.getEvaluations();
    }
    else if (path == 'discipline') {
        $scope.getQueries = function () {
            $http.get('/appraisaldata/queries')
                .success(function (r) {
                    loading.close('dismiss');
                    $scope.mydiscs = r;
                })
                .error(function () {
                    loading.close('dismiss');
                });
        };
        $scope.viewDetails = function (i) {
            $modal.open({
                backdrop: 'static',
                templateUrl: 'pages/my-discipline-details.html',
                controller: function ($scope, $modalInstance, a) {
                    $scope.qr = angular.copy(a);
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                }, resolve: {
                    a: function () { return i; }
                }
            });
        }
        $scope.respond = function (i) {
            $modal.open({
                backdrop: 'static',
                templateUrl: 'pages/my-discipline-details.html',
                controller: function ($scope, $modalInstance, a) {
                    $scope.qr = angular.copy(a); $scope.isEdit = true;
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                    $scope.sendReply = function () {
                        $scope.savingCon = true;
                        $http.post('/appraisaldata/rqueries', $scope.qr)
                            .success(function (result) {
                                if (result.success) {
                                    if (result.message) Messages.showMessage(result.message, 'success');
                                    $modalInstance.close({});
                                }
                                else {
                                    if ((result.errors || []).length > 0)
                                        result.errors.forEach(function (item) { Messages.showModalMessage(item, 'danger'); });
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }
                                }
                                $scope.savingCon = false;
                            })
                            .error(function (er) {
                                if (er && angular.isString(er)) Messages.showModalMessage(er, 'danger');
                                else if (er && er.error) Messages.showModalMessage(er.error, 'danger');
                                $scope.savingCon = false;
                            });
                    }
                }, resolve: { a: function () { return i; } }
            }).result.then(function () { $scope.getQueries(); });
        }
        $scope.getQueries();
    }
    else if (path == 'subappraisal') {
        $scope.getSubApps = function () {
            $http.get('/appraisaldata/subappraisal')
                .success(function (data) {
                    loading.close('dismiss');
                    $scope.data = data;
                    $scope.lax = true;
                })
                .error(function (err) {
                    loading.close('dismiss');
                    Messages.showMessage(angular.isString(err) ? err : 'Could not retrieve the self assessment data', 'danger');
                });
        };
        $scope.appraiseSub = function (emp) {
            $modal.open({
                backdrop: 'static',
                keyboard: false,
                size: 'lg',
                templateUrl: 'pages/kra/sub-kra-edit.html',
                controller: function ($scope, Messages, $http, sub, $modalInstance) {
                    $scope.sub = angular.copy(sub);
                    $scope.appraiseSubKra = function () {
                        $scope.savingSubKra = true;
                        $http.put('/appraisaldata/achievement', $scope.sub)
                            .success(function (result) {
                                $scope.savingSubKra = false;
                                if (result.success) {
                                    if (result.message) Messages.showMessage(result.message, 'success');
                                    $modalInstance.close({});
                                }
                                else {
                                    if (result.message) Messages.showModalMessage(result.message, 'danger');
                                    if (result.errors.length > 0)
                                        result.errors.forEach(function (item) {
                                            Messages.showModalMessage(item, 'danger');
                                        });
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }

                                }
                            }).error(function (err) {
                                loading.close('dismiss');
                                Messages.showModalMessage(angular.isString(err) ? err : 'Could not save the self assessment data', 'danger');
                            });
                    };
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                },
                resolve: { sub: function () { return emp; } }
            }).result.then(function () { $scope.getSubApps(); });
        };
        $scope.getSubApps();
    }
    else if (path == 'subcompetence') {
        $scope.getSubComps = function () {
            $http.get('/appraisaldata/subcompetence')
                .success(function (data) {
                    loading.close('dismiss');
                    $scope.data = data;
                })
                .error(function (err) {
                    loading.close('dismiss');
                    Messages.showMessage(angular.isString(err) ? err : 'Could not retrieve the performance competence data', 'danger');
                });
        }
        $scope.appraiseComp = function (emp) {
            $modal.open({
                backdrop: 'static',
                keyboard: false,
                size: 'lg',
                templateUrl: 'pages/sub-comp-edit.html',
                /**
                 * @param {object} $scope
                 */
                controller: function ($scope, Messages, $http, sub, $modalInstance) {
                    $scope = $scope || {};
                    $scope.sub = angular.copy(sub);
                    const path = 'img/' + sub.emp.employeeId + '.jpg';
                    $scope.imageURL = path;
                    $scope.tab = {}; var first = true; $scope.ind = 0;
                    var tabs = [];
                    for (var p in sub.competence) tabs.push(p);
                    angular.forEach(tabs.sort(function (a, b) { return a > b; }), function (key) {
                        $scope.tab[key] = { active: first, completed: false, index: ++$scope.ind }
                        if (first) { first = false; $scope.activeInd = 1; }
                    });
                    $scope.ss = function (area, form) {
                        $scope.tab[area].completed = form.$valid;
                        var cm = true;
                        for (var p in $scope.tab) cm && $scope.tab[p].completed;
                        if (cm) $scope.appraiseSubComp();
                        else Messages.showModalMessage('There seems to be an error in the form, please ensure all questions are appraised.')
                    }
                    $scope.appraiseSubComp = function () {
                        $scope.savingSubComp = true;
                        $http.post('/appraisaldata/subcompetence', $scope.sub)
                            .success(function (result) {
                                $scope.savingSubComp = false;
                                if (result.success) {
                                    $http.get('/appraise/recalculate').success(function(){
                                        if (result.message) Messages.showMessage(result.message, 'success');
                                        $modalInstance.close({});
                                    },function(){
                                        if (result.message) Messages.showMessage(result.message, 'success');
                                        $modalInstance.close({});
                                    });
                                }
                                else {
                                    if (result.message) Messages.showModalMessage(result.message, 'danger');
                                    if (result.errors.length > 0)
                                        result.errors.forEach(function (item) {
                                            Messages.showModalMessage(item, 'danger');
                                        });
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }
                                }
                            }).error(function (err) {
                                loading.close('dismiss');
                                $scope.savingSubComp = false;
                                Messages.showModalMessage(angular.isString(err) ? err : 'Could not retrieve the performance competence data', 'danger');
                            });
                    };
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                    $scope.canView = function (i) {
                        var cont = true;
                        for (var p in $scope.tab) if ($scope.tab[p].index < i && !$scope.tab[p].completed) cont = false;
                        return cont;
                    }
                    var getTabName = function (i) { for (var p in $scope.tab) if ($scope.tab[p].index == i) return p; return undefined; }
                    $scope.nav = function (area, form, isF) {
                        var i = $scope.tab[area].index;
                        var nx = -1;
                        if (isF) nx = i + 1; else nx = i - 1;
                        var name = getTabName(nx);
                        if (name) {
                            $scope.tab[area].completed = form.$valid;
                            if (($scope.tab[area].completed || !isF) && $scope.canView(nx))
                            { $scope.tab[area].active = false; $scope.tab[name].active = true; }
                            else if (i >= 1 && i <= $scope.ind) Messages.showModalMessage('Please complete the previous form(s)');
                        } else Messages.showModalMessage('Invalid form selected.');
                    };
                },
                resolve: { sub: function () { return emp; } }
            }).result.then(function () { $scope.getSubComps(); });
        };
        $scope.getSubComps();
    }
    else if (path == 'subperformance') {
        $scope.getSubCompHist = function () {
            $http.get('/appraisaldata/subhistory')
                .success(function () {
                    loading.close('dismiss');
                })
                .error(function () {
                    loading.close('dismiss');
                });
        }
        $scope.getSubCompHist();
    }
    else if (path == 'subdiscipline') {
        $scope.getSubDiscActions = function () {
            $http.get('/appraisaldata/subactions')
                .success(function (r) {
                    $scope.subdiscs = r;
                    $scope.getEmps();
                })
                .error(function () {
                    loading.close('dismiss');
                });
        }
        $scope.getEmps = function () {
            $http.get('/data/employees')
                .success(function (r) {
                    loading.close('dismiss');
                    $scope.employees = r;
                    $scope.query = {
                        copied: []
                    };
                })
                .error(function () {
                    loading.close('dismiss');
                    Messages.showMessage("Could not retrieve employees' data", 'danger');
                });
        }
        $scope.toggleSelection = function (id) {
            var idx = $scope.query.copied.indexOf(id);
            if (idx > -1) $scope.query.copied.splice(idx, 1);
            else $scope.query.copied.push(id);
        }
        $scope.$watch('query.employee', function (n, o) {
            if (n) $scope.query.copied = [];
        });
        $scope.getSubDiscActions();
        $scope.sendQuery = function () {
            $http.post('/appraisaldata/squery', $scope.query)
                .success(function (result) {
                    if (result.success) {
                        if (result.message) Messages.showModalMessage(result.message, 'success');
                        $scope.query = { copied: [] };
                        $scope.getSubDiscActions();
                    }
                    else {
                        if ((result.errors || []).length > 0)
                            result.errors.forEach(function (item) { Messages.showModalMessage(item, 'danger'); });
                        if (result.errfor) {
                            var msg = '';
                            for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                            if (msg != '') Messages.showModalMessage(msg, 'danger');
                        }
                    }
                })
                .error(function (er) {
                    if (er && angular.isString(er)) Messages.showModalMessage(er, 'danger');
                    else if (er && er.error) Messages.showModalMessage(er.error, 'danger');
                });
        }
        $scope.viewResponse = function (i) {
            $modal.open({
                backdrop: 'static',
                templateUrl: 'pages/sub-discipline-details.html',
                controller: function ($scope, $modalInstance, a) {
                    $scope.qr = angular.copy(a);
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                }, resolve: {
                    a: function () { return i; }
                }
            });
        }
    }
    else if (path == 'performance') {
        loading.close('dismiss');
    } else if (path == 'confirmationiv') {
        setTimeout(function () {
            loading.close('dismiss');
        });
        $scope.performCon = function (item) {
            $modal.open({
                backdrop: 'static',
                size: 'lg',
                templateUrl: 'pages/confirm-iv-form.html',
                controller: function ($scope, $modalInstance, a) {
                    $scope.eval = angular.copy(a);
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                    $scope.groups = {};
                    for (var i in $scope.eval.details) {
                        if ($scope.eval.details[i]) {
                            var h = $scope.eval.details[i].header;
                            if (!$scope.groups[h]) $scope.groups[h] = [];
                            $scope.groups[h].push({
                                area: i,
                                header: h
                            });
                        }
                    };
                    $scope.toggleselection = function (i) { $scope.eval.recommendation = $scope.eval.recommendation == i ? '' : i; }
                    $scope.submitAppraisal = function () {
                        $scope.savingCon = true;
                        $http.post('/appraisaldata/assignedconfirmation', $scope.eval)
                            .success(function (result) {
                                if (result.success) {
                                    if (result.message) Messages.showMessage(result.message, 'success');
                                    $modalInstance.close({});
                                }
                                else {
                                    if ((result.errors || []).length > 0)
                                        result.errors.forEach(function (item) {
                                            Messages.showModalMessage(item, 'danger');
                                        });
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }
                                }
                                $scope.savingCon = false;
                            })
                            .error(function (er) {
                                if (er && angular.isString(er)) Messages.showModalMessage(er, 'danger');
                                else if (er && er.error) Messages.showModalMessage(er.error, 'danger');
                            });
                    }
                }, resolve: {
                    a: function () { return item; }
                }
            }).result.then(function (item) { globals.getInvitations(); });
        }
    } else {
        try {
            loading.close('dismiss');
        } catch (e) { }
    }

    $scope.$watch('globals.isAppOpen', function () { $scope.isOpen = $scope.globals.isAppOpen; $scope.isLoaded = $scope.globals.isAppLoaded; });
});
app.controller('attCtrl', function ($scope, $http, $modal, Messages, globals, $location, $filter) {
    $scope = $scope || {};
    $scope.today = new Date();
    var path = $location.path().substr(1);
    if (path == 'attendance') {
        $scope.getRecord = function () {
            $http.get('attendance/myattendance')
                .success(function (result) {
                    $scope.myatts = result; $scope.ft = { y: result[0], m: globals.indexMonths[result[0].max - 1] };
                })
                .error(function (err) { Messages.showMessage(err, 'danger'); });
        };
        var getMonthData = function (months, m) {
            $scope.ft.m = $scope.ft.m || globals.indexMonths[m - 1];
            months.forEach(function (i) {
                if (i.month - 1 == $scope.ft.m.index) return $scope.arrDays = i.days;
            });
        };
        $scope.ichanged = function () { getMonthData($scope.ft.y.months); };
        $scope.viewLateness = function (record) {
            $modal.open({
                backdrop: 'static',
                keyboard: false,
                templateUrl: 'pages/my-attendance-det.html',
                controller: function ($scope, Messages, $http, item, $modalInstance) {
                    $scope = $scope || {};
                    $scope.att = item;
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                    $scope.replyLateness = function () {
                        $scope.submittingP = true;
                        $http.put('/attendance/myattendance/' + $scope.att._id, $scope.att)
                            .success(function (res) {
                                if (res.message) Messages.showMessage(res.message, res.success ? 'success' : 'danger');
                                if (res.success && res.success == true) {
                                    if (res.message) Messages.showMessage(res.message, 'success');
                                    $modalInstance.close({}); $scope.submittingP = true;
                                } else {
                                    if (res.message) Messages.showModalMessage(res.message, res.success ? 'success' : 'danger');
                                    (res.errors || []).forEach(function (p) { Messages.showModalMessage(p, 'danger'); $scope.submittingP = false; });
                                }
                            }).error(function (err) {
                                if (angular.isString(err)) Messages.showModalMessage(err);
                                $scope.submittingP = false;
                            });
                    }
                },
                resolve: { item: function () { return record; } }
            }).result.then(function () { $scope.getRecord(); });
        };
        $scope.$watch('ft.y', function (n, o) { if (!n) return; else getMonthData(n.months, n.max); });
        $scope.prepareRange = function (range) {
            var min = new Date(range.min); var max = new Date(range.max);
            $scope.dateRange = {};
            if (min.getFullYear() == max.getFullYear()) {
                $scope.dateRange[min.getFullYear()] = globals.months.slice(min.getMonth(), max.getMonth() + 1);
                // var diff = max.getMonth() - min.getMonth();
                //y = globals.months.slice(min.getMonth(), max.getMonth());
            }
            $scope.years = Object.keys($scope.dateRange);
            $scope.filter.month = globals.months[new Date().getMonth()];
            $scope.filter.year = $scope.years[0];
        };
    }
    else if (path == 'hrattendance') {
        $scope.ft = {}; $scope.starting = true;
        $scope.getRecord = function (date) {
            $scope.loadingData = true;
            $http.post('attendance/alltoday', { date: date || new Date() })
                .success(function (result) {
                    $scope.attds = result.att;
                    $scope.ft.d = result.date;
                    $scope.ftx = result.date; $scope.loadingData = false;
                    if ($scope.starting) $scope.starting = false;
                })
                .error(function (err) {
                    Messages.showMessage(err, 'danger');
                    $scope.loadingData = false;
                });
        };
        $scope.$watch('ft.d', function (n, o) {
            if (!n) return;
            if ($scope.ftx == $scope.ft.d) return;
            $scope.getRecord($scope.ft.d);
        });
        $scope.filterChanged = function () {
            $scope.getRecord($scope.ft)
        };
        $scope.pardon = function (att) {
            //$scope.put('/attendance/pardon/', +id);            
            $modal.open({
                backdrop: 'static',
                keyboard: false,
                templateUrl: 'pages/attendance/attendance-det.html',
                controller: function ($scope, Messages, $http, item, $modalInstance) {
                    $scope = $scope || {};
                    $scope.att = item;
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                    $scope.pardonLateness = function () {
                        $scope.submittingP = true;
                        $http.put('/attendance/pardon/' + $scope.att._id, $scope.att)
                            .success(function (res) {
                                if (res.message) Messages.showMessage(res.message, res.success ? 'success' : 'danger');
                                if (res.success && res.success == true) {
                                    $modalInstance.close({}); $scope.submittingP = true;
                                } else {
                                    (res.errors || []).forEach(function (p) { Messages.showMessage(p, 'danger'); $scope.submittingP = false; });
                                }
                            }).error(function (err) {
                                if (angular.isString(err)) Messages.showMessage(err);
                                $scope.submittingP = false;
                            });
                    }
                },
                resolve: { item: function () { return att; } }
            }).result.then(function () { $scope.getRecord(); });
        }
    }
    else if (path == 'attendancereport') {
        $scope.getRecord = function () {
            $http.get('attendance/attendancerep')
                .success(function (result) {
                    $scope.atts = result; $scope.ft = { y: result[0], m: globals.indexMonths[result[0].max - 1] };
                })
                .error(function (err) { Messages.showMessage(err, 'danger'); });
        }
        var getMonthData = function (months, m) {
            $scope.ft.m = $scope.ft.m || globals.indexMonths[m - 1];
            months.forEach(function (i) {
                if (i.month - 1 == $scope.ft.m.index) {
                    return $scope.arrEmps = i.employees;
                }
            });
        }
        $scope.ichanged = function () {
            getMonthData($scope.ft.y.months);
        };
        $scope.$watch('ft.y', function (n, o) {
            if (!n) return;
            else getMonthData(n.months, n.max);
        });
        $scope.viewMonth = function (emp) {
            $modal.open({
                backdrop: 'static',
                keyboard: false,
                size: 'lg',
                templateUrl: 'pages/attendance-report-month.html',
                controller: function ($scope, Messages, $http, emp, $modalInstance) {
                    $scope = $scope || {};
                    $scope.emp = angular.copy(emp);
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                },
                resolve: { emp: function () { return emp; } }
            });
        };
        $scope.viewYear = function (id, name, dept) {
            var y = [];
            angular.forEach($scope.ft.y.months || [], function (h) {
                var emp = $filter('filter')(h.employees, function (g) { return g.id == id; });
                if (emp.length > 0 && emp[0].days && emp[0].days.length > 0)
                    y = y.concat(emp[0]);
            });
            if (y.length == 0) return Messages.showMessage('No attendance record found for selected employee');
            $modal.open({
                backdrop: 'static',
                keyboard: false,
                size: 'lg',
                templateUrl: 'pages/attendance-report-year.html',
                controller: function ($scope, Messages, $http, emp, $modalInstance) {
                    $scope.code = new Date().getMonth();
                    $scope.emp = emp;
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                },
                resolve: { emp: function () { return { id: id, name: name, dept: dept, year: $scope.ft.y._id, months: y }; } }
            });
        };
    }
    else {
        $scope.getRecord = function () {
            $http.get('attendance/subtoday')
                .success(function (result) { $scope.att = result; })
                .error(function (err) { Messages.showMessage(err, 'danger'); });
        };
        $scope.pardonSub = function (att) {
            $modal.open({
                backdrop: 'static',
                keyboard: false,
                templateUrl: 'pages/attendance/attendance-det.html',
                controller: function ($scope, Messages, $http, item, $modalInstance) {
                    $scope.att = item;
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                    $scope.pardonLateness = function () {
                        $scope.submittingP = true;
                        $http.put('/attendance/subtoday/' + $scope.att._id, $scope.att)
                            .success(function (res) {
                                if (res.message) Messages.showMessage(res.message, res.success ? 'success' : 'danger');
                                if (res.success && res.success == true) {
                                    $modalInstance.close({}); $scope.submittingP = true;
                                } else {
                                    (res.errors || []).forEach(function (p) { Messages.showMessage(p, 'danger'); $scope.submittingP = false; });
                                }
                            }).error(function (err) {
                            if (angular.isString(err)) Messages.showMessage(err);
                            $scope.submittingP = false;
                        });
                    }
                },
                resolve: { item: function () { return att; } }
            }).result.then(function () { $scope.getRecord(); });
        }
    }
    $scope.getRecord();
});
app.controller('assetCtrl', function ($scope, $http, $modal, Messages, globals, $location) {
    $scope = $scope || {};
    var path = $location.path().substr(1);
    if (path == 'assets') {
        $scope.getAssets = function () {
            $http.get('facility/asset')
                .success(function (result) {
                    $scope.assets = result.assets;
                    $scope.assetTypes = result.assetTypes;
                    $scope.assetLocs = result.assetLocs;
                    $scope.emps = result.emps;
                });
        };
        $scope.editAsset = function (type) {
            $modal.open({
                backdrop: 'static',
                keyboard: false,
                templateUrl: 'pages/asset-new.html',
                controller: function ($scope, Messages, $http, item, refs, $modalInstance, $filter) {
                    $scope.newAsset = angular.copy(item);
                    var pass = 0;
                    $scope.refs = refs;
                    $scope.saveAsset = function () {
                        $scope.savingNewAsset = true;
                        $http.post('facility/asset', $scope.newAsset)
                            .success(function (result) {
                                if (result.success) {
                                    if (result.message) Messages.showMessage(result.message, 'success');
                                    $scope.savingNewAsset = false;
                                    $modalInstance.close({});
                                }
                                else {
                                    if (result.message) Messages.showModalMessage(result.message, 'danger');
                                    if (result.errors && result.errors.length > 0)
                                        result.errors.forEach(function (item) {
                                            Messages.showModalMessage(item, 'danger');
                                        });
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }
                                    $scope.savingNewAsset = false;
                                }
                            })
                            .error(function (err) {
                                if (angular.isString(err)) Messages.showMessage(err, 'danger');
                                $scope.savingNewAsset = false;
                            });
                    };
                    $scope.changeEmp = function (emp) {
                        if ($scope.newAsset.assigned.indexOf(emp) > -1)
                            $scope.newAsset.assigned.splice($scope.newAsset.assigned.indexOf(emp), 1);
                        else $scope.newAsset.assigned.push(emp);
                    };
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                    $scope.$watch('newAsset.type', function (n) {
                        if (pass == 0) {
                            switch (String((n || {}).shared)) {
                                case 'false':
                                    angular.forEach($scope.refs.emps, function (g) {
                                        if (!angular.isArray($scope.newAsset.assigned)) return;
                                        if ($scope.newAsset.assigned.indexOf(g._id) == 0) $scope.newAsset.assigned = g;
                                    });
                                    break;
                                case 'true': break;
                                default: $scope.newAsset.assigned = '';
                            }
                        } else if ($scope.newAsset.type.shared) $scope.newAsset.assigned = [];
                        else $scope.newAsset.assigned = '';
                        ++pass;
                    })
                },
                resolve: {
                    item: function () { return type == 'new' ? {} : type || {}; },
                    refs: function () {
                        return {
                            locs: $scope.assetLocs, types: $scope.assetTypes,
                            emps: $scope.emps, states: $scope.globals.constants.assetStates
                        };
                    }
                }
            }).result.then(function () { $scope.getAssets(); });
        };
        $scope.viewAsset = function (asset) {
            $modal.open({
                backdrop: 'static',
                templateUrl: $scope.viewPath.assetDetails,
                controller: function ($scope, item, $modalInstance, emps) {
                    $scope.asset = angular.copy(item);
                    $scope.assigned = [];
                    angular.forEach(emps, function (g) {
                        if ($scope.asset.assigned.indexOf(g._id) > -1) $scope.assigned.push(g);
                    });
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                },
                resolve: { item: function () { return asset; }, emps: function () { return $scope.emps; } }
            });
        };
        $scope.getAssets();
    }
    else if (path == 'assets/location') {
        $scope.getAssetLocations = function () {
            $http.get('facility/assetlocation')
                .success(function (result) {
                    $scope.assetLocations = result;
                });
        }
        $scope.editLoc = function (type) {
            $modal.open({
                backdrop: 'static',
                keyboard: false,
                templateUrl: 'pages/asset-new-location.html',
                controller: function ($scope, Messages, $http, item, $modalInstance) {
                    $scope.newLoc = angular.copy(item);
                    $scope.saveLoc = function () {
                        $scope.savingNewAssetLoc = true;
                        $http.post('facility/assetlocation', $scope.newLoc)
                            .success(function (result) {
                                if (result.success) {
                                    if (result.message) Messages.showMessage(result.message, 'success');
                                    $scope.savingNewAssetLoc = false;
                                    $modalInstance.close({});
                                }
                                else {
                                    if (result.message) Messages.showModalMessage(result.message, 'danger');
                                    if (result.errors && result.errors.length > 0)
                                        result.errors.forEach(function (item) {
                                            Messages.showModalMessage(item, 'danger');
                                        });
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }
                                    $scope.savingNewAssetLoc = false;
                                }
                            })
                            .error(function (err) {
                                if (angular.isString(err)) Messages.showMessage(err, 'danger');
                                $scope.savingNewAssetLoc = false;
                            });
                    }
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                },
                resolve: { item: function () { return type == 'new' ? {} : type || {}; } }
            }).result.then(function () { $scope.getAssetLocations(); });
        }
        $scope.getAssetLocations();
    }
    else if (path == 'assets/type') {
        $scope.getAssetTypes = function () {
            $http.get('facility/assettype')
                .success(function (result) {
                    $scope.assetTypes = result;
                })
                .error(function (err) {
                    Messages.showMessage(err, 'danger');
                });
        }
        $scope.editType = function (type) {
            $modal.open({
                backdrop: 'static',
                keyboard: false,
                templateUrl: 'pages/asset-new-type.html',
                controller: function ($scope, Messages, $http, item, $modalInstance) {
                    $scope.newAssetType = angular.copy(item);
                    $scope.saveAssetType = function () {
                        $scope.savingNewAssetType = true;
                        $http.post('facility/assettype', $scope.newAssetType)
                            .success(function (result) {
                                if (result.success) {
                                    if (result.message) Messages.showMessage(result.message, 'success');
                                    $scope.savingNewAssetType = false;
                                    $modalInstance.close({});
                                }
                                else {
                                    if (result.message) Messages.showModalMessage(result.message, 'danger');
                                    if (result.errors && result.errors.length > 0)
                                        result.errors.forEach(function (item) {
                                            Messages.showModalMessage(item, 'danger');
                                        });
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }
                                    $scope.savingNewAssetType = false;
                                }
                            })
                            .error(function (err) {
                                if (angular.isString(err)) Messages.showMessage(err, 'danger');
                                $scope.savingNewAssetType = false;
                            });
                    }
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                },
                resolve: { item: function () { return type == 'new' ? {} : type || {}; } }
            }).result.then(function () { $scope.getAssetTypes(); });
        }
        $scope.viewType = function (type) {
            $modal.open({
                backdrop: 'static',
                keyboard: false,
                templateUrl: 'pages/asset-type-details.html',
                controller: function ($scope, Messages, $http, item, $modalInstance) {
                    $scope.assetType = angular.copy(item);
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                },
                resolve: { item: function () { return type == 'new' ? {} : type || {}; } }
            }).result.then(function () { $scope.getAssetTypes(); });
        }
        $scope.getAssetTypes();
    }
    else if (path == 'myassets') {
        $scope.getAssets = function () {
            $http.get('facility/myasset')
                .success(function (result) {
                    $scope.assign = result.assign;
                    $scope.support = result.support;
                });
        }
        $scope.viewDetails = function (asset) {
            $modal.open({
                backdrop: 'static',
                keyboard: false,
                templateUrl: 'pages/asset-details-support.html',
                controller: function ($scope, Messages, $http, item, $modalInstance) {
                    $scope = $scope || {};
                    $scope.ticket = {}; $scope.asset = angular.copy(item);
                    $scope.ticket = {
                        asset: item,
                        location: item.location,
                        type: item.type,
                        code: item.code,
                        priority: 'Medium'
                    }
                    $scope.moreInfo = function () {
                        $http.get('/facility/sasset/' + item._id)
                            .success(function (result) {
                                $scope.as = result;
                            })
                            .error(function (err) {
                                if (angular.isString(err)) Messages.showModalMessage(err, 'info');
                            });
                    }
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                },
                resolve: {
                    item: function () { return asset || {}; }
                }
            })
        }
        $scope.viewAsset = function (asset) {
            $modal.open({
                backdrop: 'static',
                keyboard: false,
                templateUrl: 'pages/asset-details-view.html',
                controller: function ($scope, Messages, $http, item, $modalInstance) {
                    $scope = $scope || {};
                    $scope.loadingAsset = true;
                    $scope.moreInfo = function () {
                        $http.get('/facility/sasset/' + item._id)
                            .success(function (result) {
                                $scope.asset = result;
                                item = result;
                                $scope.loadingAsset = false;
                            })
                            .error(function (err) {
                                if (angular.isString(err)) Messages.showMessage(err, 'info');
                                else { Messages.showMessage('Could not retrieve asset details') }
                                $modalInstance.dismiss('Close');
                            });
                    }
                    $scope.moreInfo();
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                },
                resolve: {
                    item: function () { return asset || {}; }
                }
            })
        }
        $scope.openNewTicket = function (asset) {
            $modal.open({
                backdrop: 'static',
                keyboard: false,
                templateUrl: 'pages/asset-new-ticket.html',
                controller: function ($scope, Messages, $http, item, $modalInstance) {
                    $scope = $scope || {};
                    $scope.ticket = {}; $scope.asset = angular.copy(item);
                    $scope.ticket = {
                        asset: item,
                        location: item.location,
                        type: item.type,
                        code: item.code,
                        priority: 'Medium'
                    }
                    $scope.submitTicket = function () {
                        $scope.submittingTicket = true;
                        $http.post('facility/newticket', $scope.ticket)
                            .success(function (result) {
                                if (result.success) {
                                    if (result.message) Messages.showMessage(result.message, 'success');
                                    $scope.submittingTicket = false;
                                    $modalInstance.close({});
                                }
                                else {
                                    if (result.message) Messages.showModalMessage(result.message, 'danger');
                                    if (result.errors && result.errors.length > 0)
                                        result.errors.forEach(function (item) {
                                            Messages.showModalMessage(item, 'danger');
                                        });
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }
                                    $scope.submittingTicket = false;
                                }
                            })
                            .error(function (err) {
                                if (angular.isString(err)) Messages.showMessage(err, 'danger');
                                $scope.submittingTicket = false;
                            });
                    }
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                },
                resolve: {
                    item: function () { return asset || {}; }
                }
            }).result.then(function () { $scope.getAssets(); });
        }
        $scope.getAssets();
    }
    else if (path == 'mytickets') {
        $scope.getTickets = function () {
            $http.get('facility/myasset')
                .success(function (result) {
                    $scope.assign = result.assign;
                    $scope.support = result.support;
                });
        }
        $scope.viewTicket = function (asset, dns) {
            $modal.open({
                backdrop: 'static',
                keyboard: false,
                templateUrl: 'pages/asset-view-ticket.html',
                controller: function ($scope, Messages, $http, item, $modalInstance, dns) {
                    $scope.ticket = angular.copy(item);
                    $scope.submitReply = function () {
                        $scope.submittingTicket = true;
                        $http.post('facility/replyticket', $scope.ticket)
                            .success(function (result) {
                                if (result.success) {
                                    if (result.message) Messages.showMessage(result.message, 'success');
                                    $scope.submittingTicket = false;
                                    $modalInstance.close({});
                                }
                                else {
                                    if (result.message) Messages.showModalMessage(result.message, 'danger');
                                    if (result.errors && result.errors.length > 0)
                                        result.errors.forEach(function (item) {
                                            Messages.showModalMessage(item, 'danger');
                                        });
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }
                                    $scope.submittingTicket = false;
                                }
                            })
                            .error(function (err) {
                                $scope.submittingTicket = false;
                                if (angular.isString(err)) Messages.showMessage(err, 'danger');
                            });
                    };
                    $scope.changeStatus = function () {

                    };
                    $scope.showReply = !dns;
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                },
                resolve: {
                    item: function () { return asset || {}; },
                    dns: function(){return dns; }
                }
            }).result.then(function () { $scope.getAssets(); });
        }
        $scope.viewTicketStatus = function (asset) {
            $modal.open({
                backdrop: 'static',
                keyboard: false,
                templateUrl: 'pages/asset-view-ticket.html',
                controller: function ($scope, Messages, $http, item, $modalInstance) {
                    $scope.ticket = angular.copy(item);
                    $scope.submitReply = function () {
                        $scope.submittingTicket = true;
                        $http.post('facility/replyticket', $scope.ticket)
                            .success(function (result) {
                                if (result.success) {
                                    if (result.message) Messages.showMessage(result.message, 'success');
                                    $scope.submittingTicket = false;
                                    $modalInstance.close({});
                                }
                                else {
                                    if (result.message) Messages.showModalMessage(result.message, 'danger');
                                    if (result.errors && result.errors.length > 0)
                                        result.errors.forEach(function (item) {
                                            Messages.showModalMessage(item, 'danger');
                                        });
                                    if (result.errfor) {
                                        var msg = '';
                                        for (var p in result.errfor) msg += p + ':' + result.errfor[p] + ' ';
                                        if (msg != '') Messages.showModalMessage(msg, 'danger');
                                    }
                                    $scope.submittingTicket = false;
                                }
                            })
                            .error(function (err) {
                                $scope.submittingTicket = false;
                                if (angular.isString(err)) Messages.showMessage(err, 'danger');
                            });
                    };
                    $scope.changeStatus = function () {

                    };
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                },
                resolve: {
                    item: function () { return asset || {}; }
                }
            }).result.then(function () { $scope.getTickets(); });
        }
        $scope.getTickets();
    }
    else if (path == 'hrassets') {
        $scope.viewHistory2 = function () {
            $http.get('/assets/')
                .success(function () {

                });
        };
        $scope.getAllAssets = function () {
            $http.get($scope.dataPath.allAssetsDash)
                .success(function (r) {
                    if (angular.isObject(r)) {
                        $scope.data = r;
                    }
                });
        };
        $scope.viewHistory = function (asset) {
            $modal.open({
                backdrop: 'static',
                size: 'lg',
                keyboard: false,
                templateUrl: $scope.viewPath.assetHistory,
                controller: function ($scope, Messages, $http, item, $modalInstance) {
                    $scope.asset = angular.copy(item);
                    $scope.back = function () { $modalInstance.dismiss('Close'); };
                },
                resolve: { item: function () { return asset; } }
            }).result.then(function () { $scope.getAssetTypes(); });
        }
        $scope.getAllAssets();
    }
});
app.controller('itCtrl', function ($scope, $http, Messages, $modal) {
    $scope.getProvisioning = function () {
        $scope.loading = true;
        $http.get('/attendance/provisions')
            .success(function (result) {
                $scope.pList = result.systems; $scope.emps = result.emps;
                $scope.loading = false;
            }).error(function (er) { if (angular.isString(err)) Messages.showMessage(err); });
    };
    $scope.updateReg = function (p, s) {
        $scope.loading = true;
        $http.put('/attendance/provisions/' + p._id, { status: s })
            .success(function (res) {
                if (res.message) Messages.showMessage(res.message, res.success ? 'success' : 'danger');
                if (res.success && res.success == true) {
                    $scope.getProvisioning();
                } else {
                    (res.errors || []).forEach(function (p) {
                        Messages.showMessage(p, 'danger');
                    });
                }
            }).error(function (er) { if (angular.isString(err)) Messages.showMessage(err); });
    };
    $scope.getProvisioning();
    $scope.viewProv = function (p) {
        $modal.open({
            backdrop: 'static',
            keyboard: false,
            templateUrl: 'pages/new-provision.html',
            controller: function ($scope, Messages, $http, emps, sys, $modalInstance, $filter) {
                $scope.emps = emps;
                $scope.sysN = {
                    systemName: ''
                }
                $scope.sysN = $filter('filter')(emps, function (p) { return p.employeeId == sys.employeeId; })[0];
                $scope.submitProvision = function () {
                    $http.post('/attendance/provisions', $scope.sysN)
                        .success(function (res) {
                            if (res.message) Messages.showMessage(res.message, res.success ? 'success' : 'danger');
                            if (res.success && res.success == true) {
                                $modalInstance.close({});
                            } else {
                                (res.errors || []).forEach(function (p) {
                                    Messages.showMessage(p, 'danger');
                                });
                            }
                        }).error(function (err) { if (angular.isString(err)) Messages.showMessage(err); });
                }
                $scope.back = function () { $modalInstance.dismiss('Close'); };
            }, resolve: { emps: function () { return $scope.emps; }, sys: function () { return p; } }
        }).result.then(function () { $scope.getProvisioning(); });
    }
    $scope.newProvision = function () {
        $modal.open({
            backdrop: 'static',
            keyboard: false,
            templateUrl: 'pages/new-provision.html',
            controller: function ($scope, Messages, $http, emps, $modalInstance) {
                $scope.emps = emps;
                $scope.submitProvision = function () {
                    $http.post('/attendance/provisions', $scope.sys)
                        .success(function (res) {
                            if (res.success && res.success == true) {
                                if (res.message) Messages.showMessage(res.message, 'success');
                                $modalInstance.close({});
                            } else {
                                if (res.message) Messages.showModalMessage(res.message, 'danger');
                                (res.errors || []).forEach(function (p) { Messages.showModalMessage(p, 'danger'); });
                            }
                        }).error(function (err) { if (angular.isString(err)) Messages.showModalMessage(err); });
                }
                $scope.back = function () { $modalInstance.dismiss('Close'); };
            }, resolve: { emps: function () { return $scope.emps; } }
        }).result.then(function () { $scope.getProvisioning(); });
    }
});
app.controller('ChangeProfilePictureController', ['$scope', '$timeout', '$window', 'FileUploader',
    function ($scope, $timeout, $window, FileUploader) {

        // Create file uploader instance
        $scope.uploader = new FileUploader({
            url: 'employee/picture'
        });

        // Set file uploader image filter
        $scope.uploader.filters.push({
            name: 'imageFilter',
            fn: function (item, options) {
                var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
                return '|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
            }
        });

        // Called after the user selected a new picture file
        $scope.uploader.onAfterAddingFile = function (fileItem) {
            if ($window.FileReader) {
                var fileReader = new FileReader();
                fileReader.readAsDataURL(fileItem._file);

                fileReader.onload = function (fileReaderEvent) {
                    $timeout(function () {
                        $scope.imageURL = fileReaderEvent.target.result;
                    }, 0);
                };
            }
        };

        // Called after the user has successfully uploaded a new picture
        $scope.uploader.onSuccessItem = function (fileItem, response, status, headers) {
            // Show success message
            $scope.success = true;

            // Populate user object
            $scope.user = Authentication.user = response;

            // Clear upload buttons
            $scope.cancelUpload();
        };

        // Called after the user has failed to uploaded a new picture
        $scope.uploader.onErrorItem = function (fileItem, response, status, headers) {
            // Clear upload buttons
            $scope.cancelUpload();

            // Show error message
            $scope.error = response.message;
        };

        // Change user profile picture
        $scope.uploadProfilePicture = function () {
            // Clear messages
            $scope.success = $scope.error = null;

            // Start upload
            $scope.uploader.uploadAll();
        };

        // Cancel the upload process
        $scope.cancelUpload = function () {
            $scope.uploader.clearQueue();
            $scope.imageURL = $scope.user.profileImageURL;
        };
    }
]);
