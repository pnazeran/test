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
                scope.show = {'primes': false, 'n_is_ok': false}
                scope.user = {uid: '', prvkey: '', auth: false, attempts: 0, type: 2, }
            	scope.pubkey = {p: '', a: '', G: {'x': '', 'y': ''}, GPrv: {'x': '', 'y': ''}, n: '', base: 36}
                scope.primes = db.Primes()
                var updateCardinality = function() {
                    var Ns = db.Ns()
                    if(scope.pubkey.G.x == 1 && scope.pubkey.G.y == 2 && scope.pubkey.a == -3 && $.inArray(scope.pubkey.p.toString(), Object.keys(Ns)) > -1) 
            			scope.pubkey.n = Ns[scope.pubkey.p]
                }
                scope.$watch(function(scope) {return scope.pubkey.p}
                            , function(nV, oV) { 
                                updateCardinality()
                })
                scope.$watch(function(scope) {return scope.pubkey.a}
                            , function(nV, oV) { 
                                updateCardinality()
                })
                scope.$watch(function(scope) {return  scope.pubkey.G.x}
                    , function(nV, oV) {
                                updateCardinality()
                })
                scope.$watch(function(scope) {return  scope.pubkey.G.y}
                    , function(nV, oV) {
                                updateCardinality()
                })
                testCardinality = function() {
            		scope.pubkey.base = 10
            		p = new BigInteger(scope.pubkey.p, scope.pubkey.base)
            		n = new BigInteger(scope.pubkey.n, scope.pubkey.base)
            		a = new BigInteger(scope.pubkey.a, scope.pubkey.base)
            		gx = new BigInteger(scope.pubkey.G.x, scope.pubkey.base)
            		gy = new BigInteger(scope.pubkey.G.y, scope.pubkey.base)

                    if(p.compareTo(BigInteger.ZERO) > 0 && n.compareTo(BigInteger.ZERO) > 0 
                        && a.compareTo(BigInteger.ZERO) != 0 && gx.compareTo(BigInteger.ZERO) != 0
                        && gy.compareTo(BigInteger.ZERO) != 0) {
                    		b = gy.modPowInt(2, p).subtract(gx.modPowInt(3, p).add(gx.multiply(a))).mod(p)
                    		scope.pubkey.b = b.toString()
                    
                    		curve = new ECCurveFp(p, a, b)
                    		G = new ECPointFp(curve, curve.fromBigInteger(gx)
                    								, curve.fromBigInteger(gy))
                    	    if(G.multiply(n).isInfinity())
                    	        scope.show.n_is_ok = true
                    	    else
                    	        scope.show.n_is_ok = false
                    } else {
                        scope.show.n_is_ok = false
                    }
                }
                scope.$watch(function(scope) {return  scope.pubkey.n}
                    , function(nV, oV) {
                                testCardinality()
                })
                scope.setPrime = function(p) {
                    scope.pubkey.p = p
                    scope.show.primes = false
            	}
            	var login = function(key) {
        			if(key != null && 'ver' in key && key['ver'] == 'EC-0.1.0') {
        				EC = db.getCurve(key)
        				gx = new BigInteger(key.G.x, key.base)
        				gy = new BigInteger(key.G.y, key.base)
        				prv = new BigInteger($scope.user.prvkey, 10)
        				G = new ECPointFp(EC.curve, EC.curve.fromBigInteger(gx)
        										  , EC.curve.fromBigInteger(gy))
        				if(G.multiply(prv).equals(EC.point.prv)) {
        					scope.user.isAuth = true
        					scope.user.prvkey = prv.toString(key.base)
        					db.setUser(scope.user)
        					//$mdDialog.hide()
        				} else {
        					scope.user.isAuth = false
        				}
        			}
            	}
            	scope.login = function() {
            	    promise_login = db.PublicKey(scope.user.uid, '1')
            		promise_login.then(function(key) {login(key)}
            		    , function(err) {
            		        console.warn('could not get public key to login user: ' + err)
            		    })
            	}
            	scope.signup = function() {
            	    if(user.type == 1) {
            	        scope.pubkey.p = scope.primes[0]
            	        scope.pubkey.n = db.Ns()[scope.pubkey.p]
            	        scope.pubkey.a = '-3'
            	        scope.pubkey.G.x = '1'
            	        scope.pubkey.G.y = '2'
            	    }
            		scope.pubkey.base = 10
            		p = new BigInteger(scope.pubkey.p, scope.pubkey.base)
            		n = new BigInteger(scope.pubkey.n, scope.pubkey.base)
            		a = new BigInteger(scope.pubkey.a, scope.pubkey.base)
            		gx = new BigInteger(scope.pubkey.G.x, scope.pubkey.base)
            		gy = new BigInteger(scope.pubkey.G.y, scope.pubkey.base)
            		prv = new BigInteger(scope.user.prvkey, scope.pubkey.base)

                    if(p.compareTo(BigInteger.ZERO) > 0 && n.compareTo(BigInteger.ZERO) > 0 
                        && a.compareTo(BigInteger.ZERO) != 0 && gx.compareTo(BigInteger.ZERO) != 0
                        && gy.compareTo(BigInteger.ZERO) != 0) {
                    		b = gy.modPowInt(2, p).subtract(gx.modPowInt(3, p).add(gx.multiply(a))).mod(p)
                    		scope.pubkey.b = b.toString()
                    
                    		curve = new ECCurveFp(p, a, b)
                    		G = new ECPointFp(curve, curve.fromBigInteger(gx)
                    								, curve.fromBigInteger(gy))
                            Gprv = G.multiply(prv)
                    		
                    		$scope.pubkey.ver = 'EC-0.1.0'
                    		$scope.pubkey.base = 36
                    		$scope.pubkey.p = p.toString($scope.pubkey.base)
                    		$scope.pubkey.n = n.toString($scope.pubkey.base)
                    		$scope.pubkey.a = a.toString($scope.pubkey.base)
                    		$scope.pubkey.G.x = gx.toString($scope.pubkey.base)
                    		$scope.pubkey.G.y = gy.toString($scope.pubkey.base)
                    		$scope.pubkey.GPrv.x = Gprv.getX().x.toString($scope.pubkey.base)
                    		$scope.pubkey.GPrv.y = Gprv.getY().x.toString($scope.pubkey.base)
                    
                    		//db.newPublicKey($scope.user.uid, $scope.pubkey)                    		
                    }
            	}
            },
			restrict: 'E', 
			replace: true,
			scope: {},
			templateUrl: 'login.html'
		}
    }])
