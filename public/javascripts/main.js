/// <reference path="../lib/angular.js" />
var app = angular.module('app', ['ngRoute', 'ui.bootstrap', 'ui.calendar', 'dialogs.main', 'http-auth-interceptor',
    'bp-ngContextMenu', 'system.user', 'chart.js', 'chieffancypants.loadingBar', 'ngAnimate', 'angularFileUpload', 'ngSanitize']);
app.config(['$routeProvider', '$locationProvider', 'dialogsProvider', '$viewPath', function ($routeProvider, $locationProvider, dialogsProvider, $viewPath) {
    $routeProvider
        .when('/', {templateUrl: 'pages/home.html'})
        .when('/profile', {templateUrl: 'pages/employee/profile.html', acl: '*', title: 'Profile'})
        .when('/card', {templateUrl: 'pages/employee/data-card.html', title: 'Data Card'})
        .when('/employees', {templateUrl: 'pages/employee/employee-list.html', title: 'Employees List'})
        .when('/cards', {templateUrl: 'pages/employee/employee-card-list.html', title: 'Employees List'})
        .when('/exited', {templateUrl: $viewPath.exited, title: 'Exited Employees'})
        .when('/cash', {"templateUrl": $viewPath.cashRequest, title: 'Cash Request'})
        .when('/reset', {"templateUrl": '/pages/reset-pw.html'})
        .when('/subcash', {"templateUrl": $viewPath.subCash})
        .when('/cashreport', {"templateUrl": $viewPath.cashReport, controller: "financeCtrl"})
        .when('/leave', {"templateUrl": '/pages/leave-request.html'})
        .when('/subleave', {"templateUrl": '/pages/sub-leave.html'})
        .when('/cashlist', {"templateUrl": $viewPath.cashList, controller:"employeesCtrl"})
        .when('/approvedcash', {"templateUrl": $viewPath.approvedCash, controller: 'financeCtrl'})
        .when('/holidays', {"templateUrl": '/pages/leave-holidays.html'})
        .when('/configureleave', {"templateUrl": '/pages/leave-entitlement.html'})
        .when('/allocateleave', {"templateUrl": '/pages/leave-allocation.html', controller: 'leaveCtrl'})
        .when('/leavecalender', {"templateUrl": '/pages/leave-calender.html'})
        .when('/super', {"templateUrl": '/pages/super-settings.html', controller: 'supervisorCtrl'})

        .when('/hrattendance', {"templateUrl": '/pages/attendance/attendance-list.html', controller: 'attCtrl'})
        .when('/attendancereport', {"templateUrl": '/pages/attendance/attendance-report.html', controller: 'attCtrl'})
        .when('/attendance', {"templateUrl": '/pages/attendance/my-attendance.html', controller: 'attCtrl'})

        .when('/setup/delegationlist', {"templateUrl": '/pages/delegation-list.html', controller: 'setupCtrl'})

        //KRA Setup Paths
        .when('/setup/kra', {"templateUrl": '/pages/setup/setup-kra-uu.html', controller: 'setupCtrl'})
        .when('/setup/initiate', {"templateUrl": '/pages/setup/setup-initiate.html', controller: 'setupCtrl'})
        .when('/setup/evaluation', {"templateUrl": '/pages/setup/setup-evaluation.html', controller: 'setupCtrl'})
        //.when('/setup/competence', {"templateUrl": '/pages/setup/setup-competence.html', controller: 'setupCtrl'})
        .when('/setup/assessment', {"templateUrl": '/pages/setup/setup-assessment.html', controller: 'setupCtrl'})
        .when('/setup/confirmation', {"templateUrl": '/pages/setup/setup-confirmation.html', controller: 'setupCtrl'})
        .when('/setup/iconfirmation', {"templateUrl": '/pages/setup/setup-iconfirmation.html', controller: 'setupCtrl'})
        //
        //Appraisals Reports and Dashboard
        .when('/hrassessment', {"templateUrl": '/pages/appraisal-assessment.html', controller: 'appraisalCtrl'})
        .when('/hrappraisal', {"templateUrl": '/pages/appraisal-kra.html', controller: 'appraisalCtrl'})
        //.when('/hrcompetence', {"templateUrl": '/pages/appraisal-competence.html', controller: 'appraisalCtrl'})
        .when('/hrevaluation', {"templateUrl": '/pages/appraisal-evaluation.html', controller: 'appraisalCtrl'})
        .when('/hrperformance', {"templateUrl": '/pages/appraisal-competence-history.html', controller: 'appraisalCtrl'})
        .when('/hrconfirmation', {"templateUrl": '/pages/appraisal-confirmation.html', controller: 'appraisalCtrl'})
        .when('/hrappraisalsum', {"templateUrl": '/pages/appraisal-kra-summary.html', controller: 'appraisalCtrl'})
        .when('/hrdiscipline', {"templateUrl": '/pages/appraisal-disciplinary.html', controller: 'appraisalCtrl'})
        //
        //Appraisal Details
        .when('/assessment', {"templateUrl": '/pages/appraise-self.html', controller: 'appraiseCtrl'})
        .when('/appraisal', {"templateUrl": '/pages/appraise-employee.html', controller: 'appraiseCtrl'})
        //.when('/competence', {"templateUrl": '/pages/appraise-competence.html', controller: 'appraiseCtrl'})
        .when('/evaluatesup', {"templateUrl": '/pages/appraise-supervisor.html', controller: 'appraiseCtrl'})
        .when('/subfeedback', {"templateUrl": '/pages/appraise-sub-feedback.html', controller: 'appraiseCtrl'})
        .when('/discipline', {"templateUrl": '/pages/appraise-discipline.html', controller: 'appraiseCtrl'})
        .when('/performance', {"templateUrl": '/pages/performance-chart.html', controller: 'appraiseCtrl'})
        .when('/confirmationiv', {"templateUrl": '/pages/appraise-confirmation.html', controller: 'appraiseCtrl'})
        //
        .when('/department', {"templateUrl": '/pages/dept-list.html', controller: 'deptCtrl'})
        .when('/quote', {"templateUrl": '/pages/quote-list.html', controller: 'quoteCtrl'})
        //.when('/testpage', { "templateUrl": '/test.html', controller: 'apiTestCtrl' })
        //
        //Subordinate Appraisal
        .when('/subattendance', {"templateUrl": '/pages/attendance/sub-attendance.html', controller: 'attCtrl'})
        .when('/subappraisal', {"templateUrl": '/pages/kra/sub-kra.html', controller: 'appraiseCtrl'})
        //.when('/subcompetence', {"templateUrl": '/pages/sub-competence.html', controller: 'appraiseCtrl'})
        //.when('/subperformance', {"templateUrl": '/pages/sub-competence-history.html', controller: 'appraiseCtrl'})
        .when('/subdiscipline', {"templateUrl": '/pages/sub-discipline.html', controller: 'appraiseCtrl'})
        //
        //Facility Management
        .when('/hrassets', {"templateUrl": $viewPath.assetDashboard, controller: 'assetCtrl'})
        .when('/myassets', {"templateUrl": '/pages/my-assets.html', controller: 'assetCtrl'})
        .when('/mytickets', {"templateUrl": '/pages/my-tickets.html', controller: 'assetCtrl'})
        .when('/assets', {"templateUrl": '/pages/asset-list.html', controller: 'assetCtrl'})
        .when('/assets/type', {"templateUrl": '/pages/asset-type-list.html', controller: 'assetCtrl'})
        .when('/assets/location', {"templateUrl": '/pages/asset-location-list.html', controller: 'assetCtrl'})

        //Training 
        .when('/training', {"templateUrl": '/pages/training-list.html', controller: 'trainingCtrl'})

        .when('/system/list', {"templateUrl": '/pages/system-list.html', controller: 'itCtrl'})

        .when('/mycases', {"templateUrl": $viewPath.myCases, controller: 'caseCtrl'})
        .when('/casereports', {"templateUrl": $viewPath.caseReport, controller: 'caseCtrl'})
        .when('/closedcases', {"templateUrl": $viewPath.closedCaseReport, controller: 'caseCtrl'})
        .when('/definecase', {"templateUrl": $viewPath.defineCase, controller: 'caseCtrl'})
        .when('/cases', {"templateUrl": $viewPath.cases, controller: 'caseCtrl'})
        //.when('/assetd/location', { "templateUrl": '/pages/asset-location-list.html', controller: 'assetCtrl' })
    ;
    $locationProvider.html5Mode(true).hashPrefix('!');
    dialogsProvider.useBackdrop('static');
    dialogsProvider.useEscClose(false);
    dialogsProvider.useCopy(false);
    dialogsProvider.setSize('md');
}]);
app.config(['datepickerConfig',function (d) {
    d.showWeeks = false;
}]);
app.constant('$viewPath', {
    alert: '/pages/message-alert.html',
    alertModal: '/pages/message-alert-modal.html',
    assetDashboard: '/pages/assets-dashboard.html',
    assetDashList: 'pages/dashList.html',
    assetDashPending: 'pages/dashboard-pending-tickets.html',
    assetHistory: '/pages/asset-history-details.html',
    assetDetails: '/pages/asset-view-details.html',
    myCases: '/pages/case/case-my.html',
    defineCase: '/pages/case/case-define.html',
    cases: '/pages/case/case-list.html',
    caseReport: '/pages/case/case-report.html',
    closedCaseReport: '/pages/case/case-report-closed.html',
    exited: '/pages/employee/employee-list-exited.html',


    approvedCash: '/pages/finance/finance-cash-list.html',
    cashList: '/pages/finance/cash-list.html',
    cashReport: '/pages/cash-report.html',
    cashRequest: '/pages/cash-request.html',
    subCash: '/pages/sub-cash.html',



});
app.constant('$dataPath', {
    allAssetsDash: '/facility/hrassets',
    myCases: '/case/mycases',
    cases: '/case/mycases',
    icases: '/case/icases',
    counsels: '/case/counsels',
    caseReport: '/case/reports',
    closedCaseReport: '/case/reports/closed',
    exited: '/employees/exited'
});
app.run(['$rootScope', 'globals', '$location', '$viewPath', '$dataPath', function ($rootScope, globals, $location, $viewPath, $dataPath) {
    $rootScope.viewPath = $viewPath;
    $rootScope.dataPath = $dataPath;
    $rootScope.$on("$routeChangeStart", function (event, next, current) {
        $rootScope.pageTitle = (((next || {}).$$route || {}).title) ? (' - ' + next.$$route.title) : $rootScope.pageTitle = '';
    });
}]);
app.run(['$rootScope', function ($rootScope) {
    $rootScope.getScoring = function (i) {
        return $rootScope.scoring[i] || '#333333';
    };
    $rootScope.scoring = {
        'Exceptional': 'blue',
        'Excellent': 'green',
        'Very Good': 'brown',
        'Good': 'yellow',
        'Satifactory': 'red'
    }
    $rootScope.open = function ($event, control) {
        $event.preventDefault();
        $event.stopPropagation();
        this[control] = true;
    };
    $rootScope.getEmpData = function (ax) {
        return {
            name: ax.employee.firstName + ' ' + ax.employee.lastName,
            department: ax.employee.department.name,
            completed: ax.date,
            designation: ax.employee.designation,
            id: ax.employee.employeeId
        }
    };
    $rootScope.getNamesFromCol = function (arr, arr2) {
        arr2 = arr2 || [];
        if (angular.isArray(arr) && angular.isArray(arr2)) {
            return (arr.concat(arr2)).map(function (p) {
                return $rootScope.getName(p);
            }).toString();
        } else if (angular.isArray(arr)) {
            return arr.map(function (p) {
                return $rootScope.getName(p);
            }).toString();
        }
    };
    $rootScope.getNamesFromColAsCol = function (arr, arr2) {
        arr2 = arr2 || [];
        if (angular.isArray(arr) && angular.isArray(arr2)) {
            return (arr.concat(arr2)).map(function (p) {
                return $rootScope.getName(p);
            });
        } else if (angular.isArray(arr)) {
            return arr.map(function (p) {
                return $rootScope.getName(p);
            });
        }
    };
    $rootScope.getName = function (em) {
        if (!em) return;
        if (em.name) return em.name;
        em.name = em.firstName + ' ' + em.lastName;
        return em.name;
    };
    $rootScope.listSize = function (count) {
        if (!count) return;
        if (count > 5) return '164px';
        return (count * 30 + 14) + 'px';
    };
    $rootScope.teamSize = 3;
    $rootScope.noop = angular.noop;
    $rootScope.AsDate = function (str) {
        if (angular.isDate(str)) return str;
        else return new Date(str);
    };
    $rootScope.areEqual = function (arg1, arg2) {
        return angular.equals(arg1, arg2);
    };
    $rootScope.parArray = {'Male': 'Paternity', 'Female': 'Maternity'};
    $rootScope.getLastDayinMonth = function (n, y) {
        var lastDay;
        switch (n) {
            case 3:
            case 5:
            case 8:
            case 10:
                lastDay = 30;
                break;
            case 0:
            case 2:
            case 4:
            case 6:
            case 7:
            case 9:
            case 11:
                lastDay = 31;
                break;
            case 1:
                if (isLeap(y)) lastDay = 29; else lastDay = 28;
                break;
            default:
                break;
        }
        return lastDay;
    };
    var isLeap = function (y) {
        return (y % 4 == 0 && y % 100 != 0) || (y % 100 == 0 && y % 400 == 0);
    };
    $rootScope.disabled = function (date, mode) {
        return (mode === 'day' && (date.getDay() === 0 || date.getDay() === 6));
    };
}]);
app.factory('globals', ['$rootScope', '$http', '$location', '$interval', function ($rootScope, $http, $location, $interval) {
    var service = {};
    service.isAppLoaded = false;
    service.getConstants = function () {
        $http.get('/javascripts/constants.json')
            .success(function (data) {
                if (data) {
                    service.constants = data;
                    $http.get('/organisations')
                        .success(function (data) {
                            service.constants.organisations = data || [];
                        });
                }
            });
    };
    service.getUser = function () {
        $http.get('/account')
            .then(function (resp) {
                if (resp.status == '200' && resp.data) {
                    if (angular.isString(resp.data)) {
                        $location.path('/');
                    }
                    else if (resp.data.employee && resp.data.username) {
                        $rootScope.employee = resp.data.employee;
                        $rootScope.user = {
                            username: resp.data.username,
                            fullName: resp.data.fullName,
                            info: resp.data.info
                        };
                        $rootScope.$broadcast('event:user', $rootScope.user);
                    }
                    else {
                        console.log(keys);
                    }
                }
            });
    };
    service.navigateTo = function (path) {
        $location.path(path ? path : '/');
    };
    service.getRequests = function () {

    };
    service.getTeamRequests = function () {
        return $http.get('/employee/subrequests')
            .success(function (result) {
                service.subrequests = result || {};
            });
    };
    service.getSuperiors = function () {
        $rootScope.$broadcast('event:superiors');
    };
    service.getQuoteOfDay = function () {
        return $http.get('/dayquote')
            .success(function (result) {
                $rootScope.slideInterval = 4000;
                result = angular.copy(result || []);
                service.dayQuote = result.slice(0, result.length);
                $rootScope.$broadcast('event:quote');
            });
    };
    service.getMessages = function () {
        return $http.get('/employee/messages', {
                ignoreLoadingBar: true
            })
            .success(function (result, state) {
                service.mailMessages = result || [];
                $rootScope.$broadcast('event:mails');
            });
    };
    service.indexMonths = [
        {index: 0, name: 'January'}, {index: 1, name: 'February'}, {index: 2, name: 'March'}, {
            index: 3,
            name: 'April'
        }, {index: 4, name: 'May'}, {index: 5, name: 'June'}, {index: 6, name: 'July'}, {
            index: 7,
            name: 'August'
        }, {index: 8, name: 'September'}, {index: 9, name: 'October'}, {index: 10, name: 'November'}, {
            index: 11,
            name: 'December'
        }];
    service.indexDays = [{index: 0, name: 'Sunday'}, {index: 1, name: 'Monday'}, {index: 2, name: 'Tuesday'}, {
        index: 3,
        name: 'Wednesday'
    }, {index: 4, name: 'Thursday'}, {index: 5, name: 'Friday'}, {index: 6, name: 'Saturday'}]
    service.days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    service.months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    service.getInvitations = function () {
        return $http.get('/appraisaldata/assignedconfirmation')
            .success(function (result) {
                service.ivs = result;
            });
    };
    $http.get('/appraisal/current')
        .success(function (r) {
            service.curentPeriod = r;
            var date = new Date(new Date().toDateString());
            service.isAppOpen = new Date(r.end) >= date;
            service.isAppLoaded = true;
        });
    Date.prototype.nextDay = function (d, allDays) {
        var end = new Date(this);
        var count = 0;
        while (count < d) {
            end.setDate(end.getDate() + 1);
            if (!allDays && (end.getDay() == 6 || end.getDay() == 0)) continue;
            count++;
        }
        if (allDays && (end.getDay() == 6 || end.getDay() == 0)) switch (end.getDay()){
                case 6:
                    end.setDate(end.getDate() + 2);
                    break;
                case 0:
                    end.setDate(end.getDate() + 1);
                    break;
            }
        return end;
    };
    Date.prototype.addDay = function (d) {
        var end = new Date(this);
        var count = 0;
        while (count < d) {
            end.setDate(end.getDate() + 1);
            count++;
        }
        return end;
    };
    service.company = 'Kenna Partners';
    service.website = 'http://www.kennapartners.com';
    service.email = 'info@kennapartners.com';
    service.title = 'Kenna Counsel';
    service.year = new Date().getFullYear();
    $rootScope.globals = service;
    service.isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
    service.isSafari = navigator.userAgent.toLowerCase().indexOf('safari') > -1;
    $rootScope.exportToX = function (url) {
        download(url);
    };
    function download(sUrl) {
        if (/(iP)/g.test(navigator.userAgent)) {
            alert('Your device do not support files downloading. Please try again in desktop browser.');
            return false;
        }
        if (service.isChrome || service.isSafari) {
            var link = document.createElement('a');
            link.href = sUrl;
            if (link.download !== undefined)
                link.download = sUrl.substring(sUrl.lastIndexOf('/') + 1, sUrl.length);
            if (document.createEvent) {
                var e = document.createEvent('MouseEvents');
                e.initEvent('click', true, true);
                link.dispatchEvent(e);
                return true;
            }
        }
        window.open(sUrl + '?download', '_self');
    }

    $interval(function () {
        service.getMessages();
    }, 660000);
    service.getQuoteOfDay();
    return service;
}]);
app.directive('contextMenu', ['$parse', function ($parse) {
    var renderContextMenu = function ($scope, event, options) {
        if (!$) {
            var $ = angular.element;
        }
        $(event.currentTarget).addClass('context');
        var $contextMenu = $('<div>');
        $contextMenu.addClass('dropdown clearfix');
        var $ul = $('<ul>');
        $ul.addClass('dropdown-menu');
        $ul.attr({'role': 'menu'});
        $ul.css({
            display: 'block',
            position: 'absolute',
            left: event.pageX + 'px',
            top: event.pageY + 'px'
        });
        angular.forEach(options, function (item, i) {
            var $li = $('<li>');
            if (item === null) {
                $li.addClass('divider');
            } else {
                $a = $('<a>');
                $a.attr({tabindex: '-1', href: '#'});
                $a.text(typeof item[0] == 'string' ? item[0] : item[0].call($scope, $scope));
                $li.append($a);
                $li.on('click', function ($event) {
                    $event.preventDefault();
                    $scope.$apply(function () {
                        $(event.currentTarget).removeClass('context');
                        $contextMenu.remove();
                        item[1].call($scope, $scope);
                    });
                });
            }
            $ul.append($li);
        });
        $contextMenu.append($ul);
        var height = Math.max(
            document.body.scrollHeight, document.documentElement.scrollHeight,
            document.body.offsetHeight, document.documentElement.offsetHeight,
            document.body.clientHeight, document.documentElement.clientHeight
        );
        $contextMenu.css({
            width: '100%',
            height: height + 'px',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 9999
        });
        $(document).find('body').append($contextMenu);
        $contextMenu.on("mousedown", function (e) {
            if ($(e.target).hasClass('dropdown')) {
                $(event.currentTarget).removeClass('context');
                $contextMenu.remove();
            }
        }).on('contextmenu', function (event) {
            $(event.currentTarget).removeClass('context');
            event.preventDefault();
            $contextMenu.remove();
        });
    };
    return function ($scope, element, attrs) {
        element.on('contextmenu', function (event) {
            $scope.$apply(function () {
                event.preventDefault();
                var options = $scope.$eval(attrs.contextMenu);
                if (options instanceof Array) {
                    renderContextMenu($scope, event, options);
                } else {
                    throw '"' + attrs.contextMenu + '" not an array';
                }
            });
        });
    };
}]);