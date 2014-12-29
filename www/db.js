modone.factory('db', ['$resource', '$rootScope', '$q', '$http' , function($resource, $rootScope, $q, $http) {
		var factory = {}

		// -------------------------------------
		var publickey = {}
		var privatekey = {}
		var data = {}
		var index = {}
		var user = {uid: '', type: 0, isAuth: false}

		factory.setUser = function(_in) {
			user.uid = _in.uid
			user.type = _in.type;
			user.isAuth = true;
			privatekey['1'] = _in.prvkey;
			$rootScope.$broadcast('uid')
			promise = factory.ChnlConnect(user.uid)
			promise.then(function(key) {}, function(err) {console.log(err)})
		}
		factory.User = function() {
			return {'uid': user.uid, 'type': user.type}
		}
		factory.isAuth = function() {
			return user.isAuth
		}
		factory.Primes = function() {
			return ["76921421106760125285550929240903354966370431827792714920086011488103952094969175731459908117375995349245839343", 
					"30925729459015376480470394633122420870296099995740154747268426836472045107181955644451858184784072167623952123",
					"14083359469338511572632447718747493405040362318205860500297736061630222431052998057250747900577940212317413063",
					"36261430139487433507414165833468680972181038593593271409697364115931523786727274410257181186996611100786935727"]
		}
		factory.Ns = function(p) {
			ns = {	 "76921421106760125285550929240903354966370431827792714920086011488103952094969175731459908117375995349245839343"
					:"76921421106760125285550929240903354966370431827792714929845122243398237739585943124586402661996615655315066920",
				 	 "30925729459015376480470394633122420870296099995740154747268426836472045107181955644451858184784072167623952123"
					:"30925729459015376480470394633122420870296099995740154754253194263875592720480570831331405720099609295546395360", 
					 "14083359469338511572632447718747493405040362318205860500297736061630222431052998057250747900577940212317413063"
				  	:"14083359469338511572632447718747493405040362318205860494107907984030977930274055837182827065586946054724395920",
					 "36261430139487433507414165833468680972181038593593271409697364115931523786727274410257181186996611100786935727"
				  	:"36261430139487433507414165833468680972181038593593271407450778293003646695933756015759043369503035639290296876"}
			if(typeof p == 'undefined')
				return ns
			else
				return ns[p]
		}
		publicKey = function(uid, name) {
			if(uid != null) {
				if(uid in publickey)
					if(name != null)
						if(name in publickey[uid])
							return publickey[uid][name]
						else
							return null
					else 
						return publickey[uid]
				else
					return null
			} else
				return publickey
		}
		PrivateKey = function(key) {
			if(typeof key == 'undefined')
				return privatekey
			else if(key in privatekey)
				return privatekey[key]
		}
		upd8PublicKey = function(keysets) {
			angular.forEach(keysets, function(keyset, uid) {
				if(!(uid in publickey))
					publickey[uid] = {}
				angular.forEach(angular.fromJson(keyset), function(value, key) {
					publickey[uid][key] = angular.fromJson(value)
				})
			})
			$rootScope.$broadcast('key')
		}
		factory.newPublicKey = function(uid, key) {
			promise = factory.restNewPublicKey(uid, key)
			promise.then(function(cb) {
				upd8PublicKey(cb['key'])
			}, function(err) {
				console.warn('new PublicKey ')
			})
		}
		factory.PublicKey = function(uid, name) {
			var deferred = $q.defer()
			keyset = publicKey(uid, name)
			if(keyset != null)
				deferred.resolve(keyset)
			else {
				promise = factory.restGetPublicKey(uid)
				promise.then(function(cb) {
					if(uid in cb) {
						upd8PublicKey(cb)
						key = publicKey(uid, name)
						if(key != null)
							deferred.resolve(key)
						else
							deferred.reject('user found but key not found')
					} else
						deferred.reject('user not found')
				}, function(err) {
					deferred.reject(err)
				})
			}
			return deferred.promise;
		}
// --------------------------------------------------------------		
// --------------------------------------------------------------
		factory.Data = function(sid) {
			return data[sid]
		}
// --------------------------------------------------------------		
// --------------------------------------------------------------
		factory.getCurve = function(pubkey, multiplier, point) {
			result = {curve: null, point: null}

			p = new BigInteger(pubkey.p, pubkey.base)
			a = new BigInteger(pubkey.a, pubkey.base)
			Gx = new BigInteger(pubkey.G.x, pubkey.base)
			Gy = new BigInteger(pubkey.G.y, pubkey.base)	

			b = Gy.modPowInt(2, p).subtract(Gx.modPowInt(3, p).add(Gx.multiply(a))).mod(p)
			curve = new ECCurveFp(p, a, b)
			if(typeof point == 'undefined') {
				gprvx = new BigInteger(pubkey.GPrv.x, pubkey.base)
				gprvy = new BigInteger(pubkey.GPrv.y, pubkey.base)	
			} else {
				gprvx = new BigInteger(point.x, pubkey.base)
				gprvy = new BigInteger(point.y, pubkey.base)	
			}
			Point = new ECPointFp(curve, curve.fromBigInteger(gprvx)
									   , curve.fromBigInteger(gprvy))
			if(typeof multiplier != 'undefined') {
				if(multiplier == 0) {
					rng = new Uint8Array(100)
					window.crypto.getRandomValues(rng)
					rng16 = []
					for(i = 0; i < rng.length; i++)
						rng16.push(rng[i].toString(16))
					multiplier = new BigInteger(rng16.join(''), 16)
				} else
					multiplier = new BigInteger(multiplier, pubkey.base)
				G = new ECPointFp(curve, curve.fromBigInteger(Gx)
									   , curve.fromBigInteger(Gy))
				pubPoint = G.multiply(multiplier)
				prvPoint = Point.multiply(multiplier)
				tp = pubPoint
			} else {
				prvPoint = Point
				pubPoint = Point
			}

			result.curve = curve;
			result.point = {'pub': pubPoint, 'prv': prvPoint}
			return result
		}
		factory.encrypt = function(text, curve, point, base) {
			mONE = BigInteger.ONE.negate();
			TWO = new BigInteger("2", 10);
			FOUR = new BigInteger("4", 10)
			SQRT = 10000
			biSQRT = new BigInteger(SQRT.toString(), 10)
			CHUNK = 10
			if(typeof base == 'undefined')
				base = 36

			cipher = []
			while(text.length > 0) {
				chunk = Math.min(CHUNK, text.length);
				rootExists = false
				while(!rootExists) {
					txt = text.substr(0, chunk);
					txt16 = []
					for(i = 0; i < txt.length; i++) {
						txt16[i] = txt.charCodeAt(i).toString(16)
						txt16[i] = Array(5 - txt16[i].length).join('0') + txt16[i]
					}
					mx = new BigInteger(txt16.join(''), 16)

					mx = mx.multiply(biSQRT)
					my2 = mx.modPowInt(3, p).add(mx.multiply(a)).mod(p)
					cnt = 0
					while(++cnt < SQRT-1 && my2.modPow(p.add(mONE).divide(TWO), p).toString() != '1') {
						mx = mx.add(BigInteger.ONE)
						my2 = mx.modPowInt(3, p).add(mx.multiply(a)).mod(p)
					}
					if(my2.modPow(p.add(mONE).divide(TWO), p).toString() == '1') {
						rootExists = true
					} else if(chunk > 1) {
						chunk--;
					} else {
						console.error("DIDN'T FIND SQUARE ROOT?!?!?!?!")
						rootExists = true
					}
				}
				my = my2.modPow(p.add(BigInteger.ONE).divide(FOUR), p)
				ci = point.prv.add(new ECPointFp(curve, curve.fromBigInteger(mx), curve.fromBigInteger(my)))
				cipher.push({'x': ci.getX().x.toString(base), 'y': ci.getY().x.toString(base)})
				text = text.substr(chunk)
			}
			return {'base': base
					, 'point': {'x': point.pub.getX().x.toString(base)
							  , 'y': point.pub.getY().x.toString(base)}
					, 'cipher': cipher}
		}
		factory.decrypt = function(cipher, curve, point, base) {
			SQRT = 10000
			biSQRT = new BigInteger(SQRT.toString(), 10)
			text = [];
			point = point.prv.negate()

			for(i = 0; i < cipher.length; i++) {
				Gcipher = new ECPointFp(curve, curve.fromBigInteger(new BigInteger(cipher[i].x, base))
											 , curve.fromBigInteger(new BigInteger(cipher[i].y, base)))
				m = Gcipher.add(point)
				text16 = m.getX().x.divide(biSQRT).toString(16)
				txt = []
				while(text16.length > 0) {
					txt.push( String.fromCharCode(parseInt(text16.substr(Math.max(0, text16.length - 4), 4), 16) ) )
					text16 = text16.substr(0, text16.length - 4)
				}
				text.push( txt.reverse().join('') )
			}
			return text.join('')
		}
		factory.GenerateKey = function(name, keyset, base) {
			if(typeof base == 'undefined')
				base = 36
			if(typeof keyset == 'undefined') {
				p = new BigInteger(factory.Primes()[0], 10)
				a = new BigInteger('-3', 10)
				Gx = new BigInteger('1', 10)
				Gy = new BigInteger('2', 10)
				n = new BigInteger(factory.Ns(p.toString(10)), 10)
				rng = new Uint8Array(100) 
				//TODO: 100 may be too long for the chosen prime
				window.crypto.getRandomValues(rng)
				rng16 = []
				for(i = 0; i < rng.length; i++)
					rng16.push(rng[i].toString(16))
				prv = new BigInteger(rng16.join(''), 16)
				keyset = {}
			} else {
				if('ver' in keyset[name] && keyset[name].ver == 'EC-0.1.0') {
					p = new BigInteger(keyset[name].p, 10)
					a = new BigInteger(keyset[name].a, 10)
					Gx = new BigInteger(keyset[name].G.x, 10)
					Gy = new BigInteger(keyset[name].G.y, 10)	
					prv = new BigInteger(keyset[name].prv, 10) 
					n = new BigInteger(keyset[name].n, 10) // cardinality
				}
			}
			if(typeof p != 'undefined') {
				keyset[name] = {'ver': 'EC-0.1.0', 'base': base
								, 'p': p.toString(base)
								, 'a': a.toString(base)
								, 'G': {'x': Gx.toString(base)
									  , 'y': Gy.toString(base)}
								, 'prv': prv.toString(base)
								, 'n': n.toString(base)}
				b = Gy.modPowInt(2, p).subtract(Gx.modPowInt(3, p).add(Gx.multiply(a))).mod(p)
				curve = new ECCurveFp(p, a, b)
				G = new ECPointFp(curve, curve.fromBigInteger(Gx)
										, curve.fromBigInteger(Gy))
				GPrv = G.multiply(prv)
				keyset[name]['GPrv'] = {'x': GPrv.getX().x.toString(base)
									, 'y': GPrv.getY().x.toString(base)}
			} else
				return {}
			return keyset			
		}
		factory.sign = function(_m, pubkey) {
			if('prv' in pubkey) {
				prv = new BigInteger(pubkey['prv'], pubkey.base)
				n = new BigInteger(pubkey.n, pubkey.base)
				p = new BigInteger(pubkey.p, pubkey.base)
				a = new BigInteger(pubkey.a, pubkey.base)
				Gx = new BigInteger(pubkey.G.x, pubkey.base)
				Gy = new BigInteger(pubkey.G.y, pubkey.base)	
				GPrvx = new BigInteger(pubkey.GPrv.x, pubkey.base)
				GPrvy = new BigInteger(pubkey.GPrv.y, pubkey.base)	
				m = new BigInteger(_m, pubkey.base)
				b = Gy.modPowInt(2, p).subtract(Gx.modPowInt(3, p).add(Gx.multiply(a))).mod(p)
				curve = new ECCurveFp(p, a, b)
				G = new ECPointFp(curve, curve.fromBigInteger(Gx)
									   , curve.fromBigInteger(Gy))
				cntr = 1
				relative_prime = false
				while(!relative_prime && cntr++ < 100) {
					rng = new Uint8Array(100)
					window.crypto.getRandomValues(rng)
					rng16 = []
					for(i = 0; i < rng.length; i++)
						rng16.push(rng[i].toString(16))

					r = new BigInteger(rng16.join(''), 16)
					if(r.modInverse(n).toString() != '0')
						relative_prime = true
				}
				if(!relative_prime)
					return {}
				B = G.multiply(r);
				s = m.add(prv.multiply(B.getX().x).negate()).multiply(r.modInverse(n)).mod(n)

				return {'B': {'x': B.getX().x.toString(pubkey.base)
							, 'y': B.getY().x.toString(pubkey.base)}
					  , 'm': m.toString(pubkey.base)
					  , 's': s.toString(pubkey.base)};
			} else 
				return {}
		}
		factory.verify = function(signature, pubkey) {
			// G, kG
			// B = rG
			// s = r^-1(m - k * B.x)
			// s * B = mG - B.x k * G
			// mG = s * B + B.x * kG
			p = new BigInteger(pubkey.p, pubkey.base)
			a = new BigInteger(pubkey.a, pubkey.base)
			Gx = new BigInteger(pubkey.G.x, pubkey.base)
			Gy = new BigInteger(pubkey.G.y, pubkey.base)	
			GPrvx = new BigInteger(pubkey.GPrv.x, pubkey.base)
			GPrvy = new BigInteger(pubkey.GPrv.y, pubkey.base)	
			Bx = new BigInteger(signature['auth']['B']['x'], pubkey.base)
			By = new BigInteger(signature['auth']['B']['y'], pubkey.base)
			m = new BigInteger(signature['auth']['m'], pubkey.base)
			s = new BigInteger(signature['auth']['s'], pubkey.base)

			b = Gy.modPowInt(2, p).subtract(Gx.modPowInt(3, p).add(Gx.multiply(a))).mod(p)
			curve = new ECCurveFp(p, a, b)
			G = new ECPointFp(curve, curve.fromBigInteger(Gx)
								   , curve.fromBigInteger(Gy))
			GPrv = new ECPointFp(curve, curve.fromBigInteger(GPrvx)
								   	  , curve.fromBigInteger(GPrvy))
			B = new ECPointFp(curve, curve.fromBigInteger(Bx)
								   , curve.fromBigInteger(By))

			if(B.multiply(s).add(GPrv.multiply(B.getX().x)).equals(G.multiply(m)))
				return true
			else
				return false
		}
// --------------------------------------------------------------
// --------------------------------------------------------------
		factory.test = function(text) {
			keyset = factory.GenerateKey('1')
			EC = factory.getCurve(keyset['1'])
			cipher = factory.encrypt(text, EC.curve, EC.point)
			plain = factory.decrypt(cipher.cipher, EC.curve, EC.point, cipher.base)
			return plain
		}
		factory.post = function(app, ttl, keyset) {
			var deferred = $q.defer()
			deferred.notify({'prog': 0, 'msg': 'starting'})
			keyset = factory.GenerateKey('1', keyset)
			EC = factory.getCurve(keyset['1'])
			ttl_cipher = factory.encrypt(ttl, EC.curve, EC.point)

			deferred.notify({'prog': .15, 'msg': 'header encrypted'})
			promise = factory.restURL('hdr')
			promise.then(function(url) {
				deferred.notify({'prog': .25, 'msg': 'url for header obtained'})
				promise = factory.restNewHeader(url, angular.toJson(ttl_cipher), '1')
				promise.then(function(hdr) {
					deferred.notify({'prog': .40, 'msg': 'header uploaded to remote database'})
					skyt_dec = {'did': hdr.did, 
								'keyset': keyset}
					EC = factory.getCurve(publicKey(user.uid, '1'), 0)
					skyt_cipher = factory.encrypt(angular.toJson(skyt_dec), EC.curve, EC.point)
					
					deferred.notify({'prog': .70, 'msg': 'skyt encrypted'})
					promise = factory.restURL('skyt', user.uid, app)
					promise.then(function(url) {
						deferred.notify({'prog': .80, 'msg': 'url for skyt obtained'})
						promise = factory.restNewScytale(url, user.uid, app, '1', angular.toJson(skyt_cipher), angular.toJson({}))
						promise.then(function(skyt) {
							deferred.notify({'prog': .95, 'msg': 'skyt uploaded to remote database'})
							sid = Object.keys(skyt)[0]
							data[sid] = {'skyt': {'tbl': skyt[sid]
												, 'enc': skyt_cipher
												, 'dec': skyt_dec}
											, 'hdr': {'tbl': hdr
													, 'enc': ttl_cipher
													, 'dec': ttl}
											, 'ndx': {}}
							deferred.notify({'prog': .99, 'msg': 'local database updated'})
							deferred.resolve(sid)
						}, function(err) {
							console.warn('post: error in sending skyt')
							deferred.reject('post: ' + err)
						})
					}, function(err) {
						console.warn('post: error in getting url for skyt')
						deferred.reject('post: ' + err)
					})

				}, function(err) {
					console.warn('post: error in uploading the header or in getting did back')
					deferred.reject('post: ' + err)
				})	
			}, function(err) {
				console.warn('post: could not get a url for header')
				deferred.reject('post: ' + err)
			})
			return deferred.promise;
		}
		factory.postindex = function(sid, body) {
			var deferred = $q.defer()
			deferred.notify({'prog': 0, 'msg': 'starting'})
			keyset = data[sid]['skyt']['dec']['keyset']
			key = Object.keys(keyset)[0]
			EC = factory.getCurve(keyset[key])
			body_cipher = factory.encrypt(body, EC.curve, EC.point)
			deferred.notify({'prog': .15, 'msg': 'body encrypted'})
			promise = factory.restRNG() 
			promise.then(function(rng) {
				//console.log('rng ' + rng)
				deferred.notify({'prog': .20, 'msg': 'signing the package'})
				sign = factory.sign(rng, keyset[key])
				if(!('m' in sign)) {
					console.warn(sign)
					deferred.reject('could not sign')
					return
				}
				deferred.notify({'prog': .25, 'msg': 'package is signed'})
				//console.log(data[sid]['skyt']['dec']['did'])
				promise = factory.restURL('ndx', data[sid]['skyt']['dec']['did'])
				promise.then(function(url) {
					//console.log(url)
					deferred.notify({'prog': .35, 'msg': 'url for body obtained'})
					promise = factory.restNewIndex(url, angular.toJson(body_cipher), angular.toJson({'auth': sign, 'name': {}}), '', key)
					promise.then(function(ndx) {
						deferred.notify({'prog': .99, 'msg': 'finished posting'})
						data[sid]['ndx'][ndx.d8] = {'tbl': ndx, 'enc': body_cipher, 'dec': body}
						deferred.resolve(sid)
					}, function(err) {
						console.warn('postindex: could not create new index')
						deferred.reject('postindex: ' + err)
					})
				}, function(err) {
					console.warn('postindex: could not get a url for body')
					deferred.reject('postindex: ' + err)
				})
			}, function(err) {
				console.warn('postindex: ' + err)
				deferred.reject('postindex: ' + err)
			})
			return deferred.promise
		}
		/*
			data[sid] = {'skyt': {'tbl': {uid: ''
										, app: ''
										, d8: ''
										, exp: ''
										, key: ''
										, opt: ''
										, siz: ''
										, url: ''}
								, 'enc': ''
								, 'dec': {did: ''
										, skyt: ''}}
						, 'hdr': {'tbl': {did: ''
										, d8: ''
										, exp: ''
										, key: ''
										, siz: ''
										, url: ''}
								, 'enc': ''
						 		, 'dec': ''}
						, 'ndx':[{'tbl': {did: ''
										, d8: ''
										, exp: ''
										, sgn: ''
										, tok: ''
										, siz: ''
										, key: ''
										, url: ''}
								, 'enc': ''
								, 'dec': {}}] }
		*/
		getSkyt = function(skyts, deferred) {
			angular.forEach(skyts.value, function(value, key) {
				if(key in data) {
					data[key]['skyt']['tbl'] = value
				} else {
					data[key] = {'skyt': {'tbl': value}
								, 'hdr': {}
								, 'ndx': {}}
				}
				promise = factory.restGet(data[key]['skyt']['tbl']['url'], key)
				promise.then(function(skyt) {
					key = skyt.key
					skyt = angular.fromJson(skyt.value)
					data[key]['skyt']['enc'] = skyt
					EC = factory.getCurve(publicKey(user.uid, data[key]['skyt']['tbl']['key']), PrivateKey(data[key]['skyt']['tbl']['key']), skyt.point)
					data[key]['skyt']['dec'] = angular.fromJson(factory.decrypt(skyt.cipher, EC.curve, EC.point, skyt.base))
					promise = factory.restGetHeader(data[key]['skyt']['dec']['did'], key)
					promise.then(function(hdr) {
						key = hdr.key
						data[key]['hdr']['tbl'] = hdr.value
						promise = factory.restGet(hdr.value.url, key)
						promise.then(function(header) {
							key = header.key
							header = angular.fromJson(header.value)
							data[key]['hdr']['enc'] = header
							EC = factory.getCurve(data[key]['skyt']['dec']['keyset'][data[key]['hdr']['tbl']['key']])
							data[key]['hdr']['dec'] = factory.decrypt(header.cipher, EC.curve, EC.point, header.base)
							deferred.notify({'sid': key})
							console.log('broadcasting to ' + data[key]['skyt']['tbl']['app'])
							$rootScope.$broadcast(data[key]['skyt']['tbl']['app'] + ':',  {'sid': key})
						}, function(err) {
							console.warn('get: ' + err)
							deferred.reject('get: ' + err)
						})
					}, function(err) {
						console.warn('get: ' + err)
						deferred.reject('get: ' + err)
					})
				}, function(err) {
					console.warn('get: ' + err)
					deferred.reject('get: ' + err)						
				})
			})			
		}
		factory.get = function(app, timestamp, sid) {
			var deferred = $q.defer()
			deferred.notify({'prog': 0, 'msg': 'starting'})
			promise = factory.restGetScytale(user.uid, app, timestamp, sid)
			promise.then(function(skyts) {
				deferred.notify({'prog': .2, 'msg': 'obtained ' + Object.keys(skyts.value).length + ' skyts'})
				//TODO: distribute accross workers
				getSkyt(skyts, deferred)
			}, function(err) {
				console.warn('get: ' + err)
				deferred.reject('get: ' + err)
			})
			return deferred.promise;
		}
		factory.getindex = function(sid, timestamp) {
			var deferred = $q.defer()
			deferred.notify({'prog': 0, 'msg': 'starting'})
			promise = factory.restGetIndex(data[sid]['skyt']['dec']['did'], timestamp, sid)
			promise.then(function(ndx) {
				deferred.notify({'prog': .5, 'msg': 'indexes retrieved'})
				for(row in ndx.value) {
					index = angular.fromJson(ndx.value[row])
					if(factory.verify(angular.fromJson(index['sgn']), data[sid]['skyt']['dec']['keyset'][index.key])) {
						data[sid]['ndx'][index.d8] = {'tbl': index, 'enc': {}, 'dec': {}}
						deferred.notify({'timestamp': index.d8, 'prog': .5 + (parseInt(row)+1) / (Object.keys(ndx.value).length+1) / 2, 'msg': (parseInt(row)+1) + ' out of ' + (Object.keys(ndx.value).length+1) + ' processed'})
					}
				}
				deferred.notify({'prog': 1, 'msg': 'done'})
				deferred.resolve(sid)
			}, function(err) {
				console.warn('getindex: ' + err)
				deferred.reject('getindex: ' + err)
			})
			return deferred.promise
		} 
		factory.getbody = function(sid, timestamp) {
			var deferred = $q.defer()
			deferred.notify({'prog': 0, 'msg': 'starting'})
			promise = factory.restGet(data[sid]['ndx'][timestamp]['tbl']['url'], sid)
			promise.then(function(body) {
				deferred.notify({'prog': 0.5, 'msg': 'downloaded body'})
				if(sid != body.key) {
					console.error('getindexbody sid and key did not match. this should NEVER happen')
					deferred.reject('getindexbody sid and key did not match. this should NEVER happen')
				}
				body = angular.fromJson(body.value)

				if(typeof body === 'object' && 'cipher' in body && 'base' in body) {
					data[sid]['ndx'][timestamp]['enc'] = body
					EC = factory.getCurve(data[sid]['skyt']['dec']['keyset'][data[sid]['ndx'][timestamp]['tbl']['key']])
					data[sid]['ndx'][timestamp]['dec'] = factory.decrypt(body.cipher, EC.curve, EC.point, body.base)
					deferred.notify({'prog': 0.99, 'msg': 'body decrypted'})
					deferred.resolve(sid)
				} else {
					console.warn('strange body ' + timestamp)
					console.warn(body)
					console.warn(data[sid])
					deferred.reject('getbody: got strange structure')
				}
			}, function(err) {
				console.warn('getindexbody: ' + err)
				deferred.reject('getindexbody: ' + err)
			})
			return deferred.promise
		}
		factory.put = function(sid, content) {
			/*
				skyt: modify the opt, or the date
				hdr: change title
				ndx: change content

				encrypt content
				promise = restUploadURL
				promise.then(
					send
				)
			*/
		}
		factory.copy = function(sid, uid, write_access) {
			var deferred = $q.defer()
			app = data[sid]['skyt']['tbl']['app']
			promise = factory.PublicKey(uid) 
			promise.then(function(keyset) {
				deferred.notify({'prog': 0.3, 'msg': 'keyset obtained'})
				key = Object.keys(keyset)[0]
				skyt = data[sid]['skyt']['dec']
				if(!write_access)
					for(_key in Object.keys(skyt['keyset']))
						delete skyt['keyset'][_key]['prv']
				EC = factory.getCurve(keyset[key], 0)
				skyt_cipher = factory.encrypt(JSON.stringify(skyt), EC.curve, EC.point)
				deferred.notify({'prog': 0.75, 'msg': 'skyt encrypted'})
				promise = factory.restURL('skyt', uid, app)
				promise.then(function(url) {
					deferred.notify({'prog': .80, 'msg': 'url for skyt obtained'})
					promise = factory.restNewScytale(url, uid, app, key, angular.toJson(skyt_cipher), angular.toJson({}))
					promise.then(function(skyt) {
						deferred.notify({'prog': .99, 'msg': 'skyt uploaded to remote database'})
						deferred.resolve(skyt)
					}, function(err) {
						console.warn('copy: ' + err)
						deferred.reject('copy: ' + err)
					})
				}, function(err) {
					console.warn('copy: ' + err)
					deferred.reject('copy: ' + err)
				})
			}, function(err) {
				console.warn('copy: ' + err)
				deferred.reject('copy: ' + err)
			})
			return deferred.promise
		}
// --------------------------------------------------------------		
// --------------------------------------------------------------
		var PublicKey = $resource('/key/:uid', {}, {'get': {method: 'GET'}, 'add': {method: 'POST'}, 'update': {method: 'PUT'}, 'delete': {method: 'DELETE'}})
		var Scytale = $resource('/skyt/:uid/:app:timestamp', {}, {'get': {method: 'GET'}, 'add': {method: 'POST'}, 'update': {method: 'PUT'}, 'delete': {method: 'DELETE'}})
		var Header = $resource('/hdr/:did', {}, {'get': {method: 'GET'}, 'add': {method: 'POST'}, 'update': {method: 'PUT'}, 'delete': {method: 'DELETE'}})
		var Index = $resource('/ndx/:did:timestamp', {}, {'get': {method: 'GET'}, 'add': {method: 'POST'}, 'update': {method: 'PUT'}, 'delete': {method: 'DELETE'}})
		var URL = $resource('/url/:table/:uid/:app', {}, {'get': {method: 'GET'}})
		var RNG = $resource('/rng/:len', {}, {'get': {'method': 'GET'}})

		factory.restGetPublicKey = function(uid) {
			var deferred = $q.defer()
			PublicKey.get({uid: uid}, function(cb) {
				if(cb['err'] == '') {
					deferred.resolve(cb['key'])
				} else {
					console.warn('restGetPublicKey: ' + uid + ' => ' + cb['err'])
					deferred.reject(false)
				}
			})				
			return deferred.promise
		}
		factory.restNewPublicKey = function(uid, key) {
			var deferred = $q.defer()
			o = new PublicKey()
			o.$add({uid: uid, key: key}, function(cb) {
				if(cb['err'] == '') {
					deferred.resolve(cb['key'])
				} else {
					console.warn('restNewPublicKey: ' + cb['err'])
					deferred.reject(false)
				}
			})
			return deferred.promise
		}
		factory.restGetScytale = function(uid, app, timestamp, sid) {
			var deferred = $q.defer()
			query = {'uid': uid, 'app': app}
			if(sid != null)
				query = {'uid': sid} // an ugly trick to prevent making 2 resources
			Scytale.get(query, function(cb) {
				if(cb['err'] == '') {
					deferred.resolve({'key': sid, 'value': cb['skyt']})
				} else {
					console.warn('restGetScytale: ' + cb['err'])
					deferred.reject(cb['err'])
				}
			})
			return deferred.promise
		}
		factory.restNewScytale = function(url, uid, app, key, skyt, opt) {
			var deferred = $q.defer()

			var formData = new FormData(document.forms.namedItem('upload'));
			var blob = new Blob([skyt], {type: 'application/json'})
			formData.append('key', key)
			formData.append('opt', opt)
			formData.append('skyt', blob)

			var rest = new XMLHttpRequest();
			rest.open('POST', url)
			rest.onload = function(event) {
				if(rest.status == 200) {
					resp = angular.fromJson(rest.responseText.substr(6))
					if('err' in resp && resp['err'] == '') 
						deferred.resolve(resp.skyt)
					else
						deferred.reject('unrecognizable response for new Skyt')
				} else {
					console.warn('restNewScytale: ' + uid + ' ' + app + ' => ' + rest.status)
					deferred.reject(rest.status)
				}
			}
			rest.send(formData)
			
			return deferred.promise
		}
		factory.restGetHeader = function(did, key) {
			var deferred = $q.defer()
			Header.get({did: did}, function(cb) {
				if(cb['err'] == '') {
					deferred.resolve({'key': key, 'value': cb['hdr']})
				} else {
					console.warn('restGetHeader: ' + cb['err'])
					deferred.reject(false)
				}
			})
			return deferred.promise
		}
		factory.restNewHeader = function(url, ttl, key) {
			var deferred = $q.defer()

			var formData = new FormData(document.forms.namedItem('upload'));
			var blob = new Blob([ttl], {type: 'application/json'})
			formData.append('ttl', blob)
			formData.append('key', key)

			var rest = new XMLHttpRequest();
			rest.open('POST', url)
			rest.onload = function(event) {
				if(rest.status == 200) {
					resp = angular.fromJson(rest.responseText.substr(6))
					if('err' in resp && resp['err'] == '') 
						deferred.resolve(resp.hdr)
					else
						deferred.reject('unrecognizable response for new Skyt')
				} else {
					console.warn('restNewHeader: ' + uid + ' => ' + rest.status)
					deferred.reject(rest.status)
				}
			}
			rest.send(formData)
			
			return deferred.promise
		}
		factory.restGetIndex = function(did, timestamp, key) {
			var deferred = $q.defer()
			query = {'did': did}
			if(timestamp != null)
				query['timestamp'] = timestamp
			if(did.substr(0,3) == '405')
				console.log(query)

			Index.get(query, function(cb) {
				console.log(cb)
				if(cb['err'] == '') {
					deferred.resolve({'key': key, 'value': cb['ndx']})
				} else {
					console.warn('restGetIndex: ' + cb['err'])
					deferred.reject('restGetIndex: ' + cb['err'])
				}
			})
			return deferred.promise
		}
		factory.restNewIndex = function(url, body, signature, token, key) {
			var deferred = $q.defer()

			var formData = new FormData(document.forms.namedItem('upload'));
			var blob = new Blob([body], {type: 'application/json'})
			formData.append('sgn', signature)
			formData.append('tkn', token)
			formData.append('key', key)
			formData.append('body', blob)
			
			var rest = new XMLHttpRequest();
			rest.open('POST', url)
			rest.onload = function(event) {
				if(rest.status == 200) {
					resp = angular.fromJson(rest.responseText.substr(6))
					if('err' in resp && resp['err'] == '') 
						deferred.resolve(resp.ndx)
					else {
						console.log(resp)
						deferred.reject('unrecognizable response for new Index')
					}
				} else {
					console.warn('restNewIndex: ' + rest.status)
					deferred.reject(rest.status)
				}
			}
			rest.send(formData)
			
			return deferred.promise
		}
		factory.restURL = function(table, uid, app) {
			var deferred = $q.defer()
			URL.get({table: table, uid: uid, app: app}, function(cb) {
				if('url' in cb) {
					deferred.resolve(cb['url'])
				} else {
					deferred.reject(cb)
				}
			})
			return deferred.promise
		}
		factory.restGet = function(url, key) {
			var deferred = $q.defer()
			var rest = new XMLHttpRequest();
			rest.open('GET', window.location.origin + '/data/' + url)
			rest.onload = function(event) {
				if(rest.status == 200) {
					deferred.resolve({'key': key, 'value': rest.responseText})					
				} else {
					deferred.reject(false)
				}
			}
			rest.send()
			return deferred.promise
		}
		factory.restRNG = function(len) {
			var deferred = $q.defer()
			query = {}
			if(len != null)
				query['len'] = len
			RNG.get(query, function(cb) {
				if(cb['err'] == '') {
					deferred.resolve(cb['rng'])
				} else {
					console.warn('restRNG: ' + cb['err'])
					deferred.reject('restRNG: ' + cb['err'])
				}
			})
			return deferred.promise
		}
// --------------------------------------------------------------		
// --------------------------------------------------------------
		var Chnl = $resource('/channel/:subscribe/:key', {}, {'get': {'method': 'GET'}, 'send': {method: 'POST'}})
		var chnlKey = {}
		var chnlSocket
		factory.ChnlSend = function(to, msg) {
			console.log('sending through channel to: ' + '/channel/' + to)
			$.post('/channel/' + to, {'msg': msg}, function(msg) {console.log(msg)})
		}
		factory.ChnlMessage = function(msg) {
			var deferred = $q.defer()
			msg = angular.fromJson(msg.data)
			if('skyt' in msg) {
				if(Object.keys(data).indexOf(Object.keys(msg.skyt)[0]) > -1) 
					console.log('this is my own skyt, I already have it')
				else
					getSkyt({'value': msg.skyt}, deferred)
			} else if('ndx' in msg) {
				sid = null
				for(key in data)
					if(data[key]['skyt']['dec']['did'] == msg.ndx['did']) {
						sid = key
						break
					}
				if(sid) {// && factory.verify(angular.fromJson(msg.ndx['sgn']), data[sid]['skyt']['dec']['keyset'][msg.ndx['key']])) {
					data[sid]['ndx'][msg.ndx['d8']] = {'tbl': msg.ndx, 'enc': {}, 'dec': {}}
					EC = factory.getCurve(data[sid]['skyt']['dec']['keyset'][data[sid]['ndx'][msg.ndx['d8']]['tbl']['key']])
					if('url' in msg.ndx) {
						promise = factory.getbody(sid, msg.ndx['d8'])
						promise.then(function(sid) {
							$rootScope.$broadcast(data[sid]['skyt']['tbl']['app'] + ':', {'sid': sid, 'timestamp': msg.ndx['d8']})
						})
					} else if ('data' in msg.ndx) {
						body = angular.fromJson(msg.ndx['data'])
						data[sid]['ndx'][msg.ndx['d8']]['dec'] = factory.decrypt(body.cipher, EC.curve, EC.point, body.base)
						$rootScope.$broadcast(data[sid]['skyt']['tbl']['app'] + ':', {'sid': sid, 'timestamp': msg.ndx['d8']})
					}
				}
			} else {
				console.log('not sure what is in the message')
			}
			return deferred.promise;
		}
		factory.ChnlConnect = function(subscribe) {
			var deferred = $q.defer()
			Chnl.get({'subscribe': subscribe, 'key': (subscribe in chnlKey ? null : chnlKey[subscribe])}, function(cb) {
				//console.log('ChnlConnect')
				//console.log(cb)
				if('err' in cb) {
					console.warn(cb['err'])
					deferred.reject(cb['err'])
				} else if('key' in cb && 'token' in cb) {
					chnlKey[subscribe] = cb['key']
					channel = new goog.appengine.Channel(cb['token'])
					chnlSocket = channel.open()
					chnlSocket.onopen = function() { console.log('channel opened') }
					chnlSocket.onmessage = factory.ChnlMessage
					chnlSocket.onerror = function(err) { console.warn('channel error ' + angular.toJson(err)) }
					chnlSocket.onclose = function() { console.log('channel closed') }
					deferred.resolve(cb['key'])
				}
			})
			return deferred.promise
		}

		return factory;
    }])