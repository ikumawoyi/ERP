var module = angular.module('system.user', ['ui.bootstrap', 'chieffancypants.loadingBar', 'ngAnimate', 'ngSanitize']);
module.factory('Messages', ['$timeout', function ($timeout) {
    var s = {};
    s.messages = []; s.modalMessages = [];
    s.showMessage = function (msg, level) {
        s.messages.push({ text: msg, type: level });
        $timeout(function () { s.closeMessage(0); }, 15000);
        window.scrollTo(0,0);
    };
    s.showModalMessage = function (msg, level) {
        s.modalMessages.push({ text: msg, type: level });
        $timeout(function () { s.closeModalMessage(0); }, 15000);
    };
    s.closeMessage = function (index) {
        s.messages.splice(index, 1);
    };
    s.closeModalMessage = function (index) {
        s.modalMessages.splice(index, 1);
    };
    s.processResult = function (result, pop) {
        s.messages.length = 0;
        if (result.Success || result.success) {
            if (isEmpty(result.Messages)) s.showMessage('Operation succeeded', 'success');
        }
        else if (isEmpty(result.Messages))
            s.showMessage('Operation failed', 'warning');
        angular.forEach(result.Messages, function (value, key) {
            var v = 'muted';
            switch (value) {
                case 0: v = 'muted'; break;
                case 1: v = 'primary'; break;
                case 2: v = 'success'; break;
                case 3: v = 'info'; break;
                case 4: v = 'warning'; break;
                case 5: v = 'danger'; break;
            }
            s.showMessage(key, v);
        });
    };
    return s;
}]);
module.filter('encode', [function () {
    return function (input) {
        if (input) {
            return input.replace(' ', '');
        }
    };
}]);
module.controller('msgCtrl',
    ['$scope', 'Messages', function ($scope, Messages) {
        $scope.alerts = Messages.messages;
        $scope.closeAlert = Messages.closeMessage;
        $scope.modalAlerts = Messages.modalMessages;
        $scope.closeModalAlert = Messages.closeModalMessage;
    }]).controller('stateCtrl', ['$scope', '$http', function ($scope, $http) {
        $http.get('/state', { ignoreLoadingBar: true }).success(function (r) { $scope.slogan = r.msg; });
    }]);
module.controller('loginCtrl',
    ['$scope', '$http', 'Messages', '$window', function ($scope, $http, Messages, $window) {
        $scope.user = null;
        $scope.login = function () {
            $scope.signingIn = true;
            $http.post('/login', $scope.user).
                success(function (result) {
                    $scope.signingIn = true;
                    if (result.success) $window.location.href = $window.location.href;
                    else {
                        if (result.message) Messages.showMessage(result.message, 'danger');
                        if (result.errors.length > 0) {
                            result.errors.forEach(function (item) {
                                Messages.showMessage(item, 'danger');
                            });
                        }
                       // if ('Recaptcha' in window) Recaptcha.reload();
                    }
                }).
                error(function (data, status) {
                    $scope.signingIn = false;
                    alert('Error: ' + status);
                });
        };
        // $scope.login = function () {
        //     if ('Recaptcha' in window && 'recaptcha_response_field' in window && recaptcha_response_field.value) {
        //         $scope.signingIn = true;
        //         $scope.user['recaptcha'] = recaptcha_response_field.value;
        //         $scope.user['quest'] = recaptcha_challenge_field.value;
        //         $http.post('/login', $scope.user).
        //             success(function (result) {
        //                 $scope.signingIn = false;
        //                 if (result.success) $window.location.href = $window.location.href;
        //                 else {
        //                     if (result.message) Messages.showMessage(result.message, 'danger');
        //                     if (result.errors.length > 0) {
        //                         result.errors.forEach(function (item) {
        //                             Messages.showMessage(item, 'danger');
        //                         });
        //                     }
        //                     if ('Recaptcha' in window) Recaptcha.reload();
        //                 }
        //             }).
        //             error(function (data, status) {
        //                 $scope.signingIn = false;
        //                 alert('Error: ' + status);
        //             });
        //     }
        //     else if ('Recaptcha' in window && Recaptcha.get_response() && Recaptcha.get_challenge()) {
        //         $scope.signingIn = true;
        //         $scope.user['recaptcha'] = Recaptcha.get_response();
        //         $scope.user['quest'] = Recaptcha.get_challenge();
        //         $http.post('/login', $scope.user).
        //             success(function (result) {
        //                 $scope.signingIn = false;
        //                 if (result.success) $window.location.href = $window.location.href;
        //                 else {
        //                     if (result.message) Messages.showMessage(result.message, 'danger');
        //                     if (result.errors.length > 0) {
        //                         result.errors.forEach(function (item) {
        //                             Messages.showMessage(item, 'danger');
        //                         });
        //                     }
        //                     if ('Recaptcha' in window) Recaptcha.reload();
        //                 }
        //             }).
        //             error(function (data, status) {
        //                 $scope.signingIn = false;
        //             Messages.showMessage('Error: ' + ( data || status || 'could not connect to server.'));
        //             });
        //     }
        //     else if ('Recaptcha' in window) {
        //         Messages.showMessage('Please response to the captcha', 'danger');
        //     }
        //     else {
        //         Messages.showMessage('Please wait while recaptcha loads', 'danger');
        //     }
        // };
    }]);
