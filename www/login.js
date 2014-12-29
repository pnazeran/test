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
                scope.tmp = 0
                scope.user = {uid: '', prvkey: '', auth: false, attempts: 0, type: 0, }
                scope.primes = db.Primes()
                scope.setcardiality = function() {
                    console.log('cardinality')
            		if(scope.pubkey.G.x == 1 && scope.pubkey.G.y == 2 && scope.pubkey.a == -3)  {
                        console.log('true')
            			scope.pubkey.n = db.Ns(scope.pubkey.p)
            		}
            	}
            },
			restrict: 'E', 
			replace: true,
			scope: {},
			templateUrl: 'login.html'
		}
    }])
