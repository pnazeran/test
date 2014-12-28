modone.directive('nssaLogin', ['db', function(db) {
        return {
            link: function(scope, el, attr) {
                scope.style ={'position': 'absolute'
                            , 'top': '50px'
                            , 'left': '100px'
                            , 'width': '70%'//window.innerWidth * .7 +'px'
                            , 'height': '70%'//window.innerHeight * .7 +'px'
                            , 'background-color': '#eee'
                            , 'padding': '16px'
                }
                
            },
			restrict: 'E', 
			replace: true,
			scope: {},
			templateUrl: 'login.html'
		}
    }])
