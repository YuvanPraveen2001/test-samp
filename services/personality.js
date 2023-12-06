var debug = require('debug')('cubelets:firmwareService')
var util = require('util')
var request = require('request')
var config = require('../config.json')
var Block = require('../block.js')
var Version = require('../version.js')
var NodeCache = require("node-cache");
var PouchDB = require('pouchdb')
var os = require('os')
var path = require('path')
var fs = require('fs')


var personalitiesSeed = require('./data/personalities_seed.json')

function PersonalityService() {
	var info = {}
	var baseUrl = config['urls']['personality']
	var service = this
	var personalityCache = new NodeCache()
	personalityCache.flushAll();//Destroy the local cache.

	var db;
	if (typeof process !== 'undefined' && typeof process.versions.node !== 'undefined'){
		//node-js, electron
		var dir = path.join(os.tmpdir(), 'node-cubelets', 'personalities')
		fs.mkdirSync(dir, { recursive: true });
		db = new PouchDB(dir.replace('/\\/g', '/'))
	}
	else{
		if(typeof device !== 'undefined' && device && device.platform == "iOS" && Version.parseVersion(device.version).isLessThan(new Version(10, 0, 0))){
			PouchDB.plugin(require('pouchdb-adapter-fruitdown'));
			//iOS 9 needs a different adapter
			db = new PouchDB("personalities", {adapter: 'fruitdown'})
		}
		else{
			db = new PouchDB("personalities")
		}
	}

	this.fetchPersonalitiesByBlock = function(block, config, callback) {
		//Allow config to be optional
		if(!callback && config) {
			callback = config
			config = {}
		}

		var default_config = {
		  'return_hex': true,
		  'return_source': false,
		  'return_blockly': false
		}
		config = Object.assign({}, default_config, config);

		if (!block || !block.getBlockType() || block.getBlockType().name == "unknown") {
			callback(new Error("Invalid block type provided"))
			return
		} else if (!block.getHardwareVersion() || !block.getBootloaderVersion() || !block.getApplicationVersion()) {
			callback(new Error("Invalid versions provided"))
			return;
		}

		var product = 'cubelet-' + block.getBlockType().name;
		var hardwareVersion = block.getHardwareVersion();
		var bootloaderVersion = block.getBootloaderVersion();
		var applicationVersion = block.getApplicationVersion();
		var cacheKey = product+'-'+hardwareVersion.toString()+'-'+bootloaderVersion.toString();
		var cachedResult = getCachedValue(cacheKey)

		if(cachedResult){
			cachedResult.cacheHit = true;
			callback(null, cachedResult)
			return
		}

		var params = {
			"requestType": "getSafePersonalitiesByBlock",
			"request": {
									"block_type": block.getBlockType().typeId,
									"hw_major": hardwareVersion.major,
									"hw_minor": hardwareVersion.minor,
									"hw_patch": hardwareVersion.patch,
									"bl_major": bootloaderVersion.major,
									"bl_minor": bootloaderVersion.minor,
									"bl_patch": bootloaderVersion.patch,
								}
		}

		//Merge in the optional params (fetching C code, and blockly 'code')
		params["request"] = Object.assign({}, params["request"], config);

		var options = {
			host : baseUrl,
			port : 443,
			method: "POST",
			path : '/hex/getPersonalities3.php',
			headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
		};

		makeRequest(cacheKey, options, encodeParams(params), callback, false)
	}

	this.fetchAllPersonalities = function(config, callback){
		var cacheKey = "personalities-all"

		//Allow config to be optional
		if(!callback && config) {
			callback = config
			config = {}
		}

		var default_config = {
			'return_hex': true,
			'return_source': false,
			'return_blockly': false
		}
		config = Object.assign({}, default_config, config);

		var params = {
			"requestType": "getAllPersonalities",
			"request": {}
		}
		params["request"] = Object.assign({}, params["request"], config);

		var options = {
			host : baseUrl,
			port : 443,
			method: "POST",
			path : '/hex/getPersonalities3.php',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		};
		makeRequest(cacheKey, options, encodeParams(params), callback, false)
	}

	this.fetchAllPersonalitiesSource = function(config, callback){
		/*//Example response
		{ responseType: 'getAllPersonalitySource',
		  count: 66,
		  timestamp: '2019-05-24 18:25:35 GMT',
		  success: true,
		  personalities:
		   { '1': [ [Object], [Object], [Object], [Object], [Object] ],
			 		...
			 }
		 }
		[ { name: 'Default Blocker (4.3.0)',
		    description: 'Default Blocker personality',
		    source_code: '',
		    source_blockly: '',
		    is_default: true,
		    CREATED: '2018-09-04 12:18:35',
		    UPDATED: '2018-09-04 12:18:35',
		    block_type: '1',
		    hw_major: '2',
		    hw_minor: '0',
		    hw_patch: '0' },
				...
 		]*/

		var cacheKey = "personalities-source-all"

		//Allow config to be optional
		if(!callback && config) {
			callback = config
			config = {}
		}

		//Check temperary cache
		var cachedResult = getCachedValue(cacheKey)
		if(cachedResult){
			cachedResult.cacheHit = true;
			cachedResult.cacheSource = 'temp'
			callback(null, cachedResult)
			return
		}

		var params = {
			"requestType": "getAllPersonalitySource",
			"request": {}
		}
		params["request"] = Object.assign({}, params["request"], config);

		var options = {
			host : baseUrl,
			port : 443,
			method: "POST",
			path : '/hex/getPersonalities3.php',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		};

		function handleResult(err, response){
			if(err){
				//Check long term cache
				service.getLongTermCachedValue(cacheKey, function(err, longTermCachedValue){
					if(err){
						//Read local, and set long term cache and short term cache
						setCachedValue(cacheKey, personalitiesSeed);
						service.setLongTermCachedValue(cacheKey, personalitiesSeed)
						cacheIndividualPersonalities(personalitiesSeed)
						personalitiesSeed.cacheSource = "local";
						callback(null, personalitiesSeed)
						return;
					}

					longTermCachedValue.cacheHit = true;
					longTermCachedValue.cacheSource = 'persistant'

					//Set short term cache
					setCachedValue(cacheKey, longTermCachedValue)
					cacheIndividualPersonalities(longTermCachedValue)
					callback(null, longTermCachedValue);
				})
				return
			}

			service.setLongTermCachedValue(cacheKey, response)
			cacheIndividualPersonalities(response)

			//Succeeded, result should already be in temp cache.
			callback(err, response);
		}
		makeRequest(cacheKey, options, encodeParams(params), handleResult, false)
	}

	function encodeParams(obj){
		var str = "";
		for (var key in obj) {
	    if (str != "") {
	        str += "&";
	    }
			var value = typeof obj[key] == 'string' ? encodeURIComponent(obj[key]) : encodeURIComponent(JSON.stringify(obj[key]))
	    str += key + "=" + value;
		}
		return str;
	}

	function makeRequest(cacheKey, options, params, callback)
	{
		if(typeof XMLHttpRequest != "undefined")
		{//We are likely running in the browser/cordova, use XMLHttpRequest
			var url = options.host+":"+options.port+options.path
			var request = new XMLHttpRequest()
			url = "https://"+url;
			request.open('POST', url, true)
			request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
			request.onreadystatechange = function() {
				if (request.readyState === 4 && request.status === 200) {
					try {
						var json = JSON.parse(request.responseText);
						setCachedValue(cacheKey, json);
						callback(null, json)
					} catch (e) {
						callback(e)
					}
				}
				else if(request.readyState === 4 && request.status != 200){
					callback(new Error("Failed to make request: "+options))
				}
			}
			request.onerror = function(){
				callback(new Error("Failed to make request: "+options))
			}
			request.send(params);
		}
		else
		{//We are likely running in pure node, use a node library
			var http = require('https');
			req = http.request(options, function(res) {
				var body = '';
				res.on('data', function(chunk) {
					body += chunk;
				});
				res.on('end', function() {
					try {
						var json = JSON.parse(body);
						setCachedValue(cacheKey, json);
						callback(null, json)
					} catch (e) {
						callback(e)
					}
				});
			}).on("error", (err) => {
				callback(err)
			});
			req.write(params)
			req.end()
		}
	}

	/**
		Temporary Caching used to reduce outbound requests
	**/
	function getCachedValue(cacheKey)
	{
		var value = personalityCache.get( cacheKey );
		return value;
	}
	function setCachedValue(cacheKey, value)
	{
		personalityCache.set( cacheKey, value, 10000 );
	}

	/*
		Persistant storage
	*/
	this.getLongTermCachedValue = function(cacheKey, callback){
		db.get(cacheKey).then(function(value) {
			callback(null, value.data)
		}).catch(function(err){
			callback(err);
		})
		return
	}

	this.setLongTermCachedValue = function(cacheKey, value)
	{
		//If it already exists, we need to update it.
		db.get(cacheKey).then(function(doc) {
		  var newD = {
		  	_rev: doc._rev,
			}
			var obj = Object.assign(doc, value, newD);
			return db.put(obj);
		}).then(function(response) {
		  // handle response
		  //callback(null)
		}).catch(function (err) {
		  db.put({_id: cacheKey, data: value}, function callback(err, result) {
	    	//Success
		  });
		});
	}

	function cacheIndividualPersonalities(allPersonalities){
		var timestamp = allPersonalities.timestamp
		for(var blockTypeID in allPersonalities.personalities){
			var blockTypePersonalities = allPersonalities.personalities[blockTypeID];
			var blockType = Block.blockTypeForId(parseInt(blockTypeID))
			var product = 'cubelet-' + blockType.name;
			var hardwareVersion = blockTypePersonalities[0].hw_major + '.' + blockTypePersonalities[0].hw_minor + '.' + blockTypePersonalities[0].hw_patch;
			var bootloaderVersion = '4.3.0';
			var cacheKey = product+'-'+hardwareVersion+'-'+bootloaderVersion;

			var count = blockTypePersonalities.length
			var indivdualResponse = {
				responseType: "getSafePersonalitiesByBlock",
				count: count,
				timestamp: timestamp,
				request: {
						"block_type": blockTypeID,
						"hw_major": blockTypePersonalities[0].hw_major,
						"hw_minor": blockTypePersonalities[0].hw_minor,
						"hw_patch": blockTypePersonalities[0].hw_patch,
						"bl_major": 4,
						"bl_minor": 3,
						"bl_patch": 0,
						"return_source": true,
						"return_blockly": true
				},
				success: true,
				personalities: blockTypePersonalities
			}
			setCachedValue(cacheKey, indivdualResponse);
		}
	}

	this.fetchAllPersonalitiesSource(function(err, res){
	})
}

module.exports = PersonalityService
