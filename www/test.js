modone = angular.module('modone', [])
modone.controller('TestCtrl', ['$scope', function($scope) {
    $scope.test = 'Test Controller'
}])