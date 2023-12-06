var debug = require('debug')('cubelets:firmwareService')
var util = require('util')
var request = require('request')
var config = require('../config.json')
var Version = require('../version.js')
var NodeCache = require("node-cache");

function ImagoFirmwareService() {
	var info = {}
	var baseUrl = config['urls']['imagoFirmware']
	var service = this
	var firmwareCache = new NodeCache()

	this.checkForUpdate = function(block, callback) {
		if (!block || !block.getBlockType() || block.getBlockType().name == "unknown") {
			callback(new Error("Invalid block type provided"))
			return
		} else if (!block.getHardwareVersion() || !block.getBootloaderVersion() || !block.getApplicationVersion()) {
			callback(new Error("Invalid versions provided"))
			return;
		}

		var product = 'cubelet-' + block.getBlockType().name;
		var hardwareVersion = block.getHardwareVersion().toString();
		var bootloaderVersion = block.getBootloaderVersion().toString();
		var applicationVersion = block.getApplicationVersion().toString();
		var cacheKey = product+'-'+hardwareVersion+'-'+bootloaderVersion+'-'+applicationVersion;
		var cachedResult = getCachedValue(cacheKey)

		if(cachedResult){
			cachedResult.cacheHit = true;
			callback(null, cachedResult)
			return
		}

		var options = {
			host : baseUrl,
			port : 80,
			path : '/firmware?' + ['platform=cubelets', 'product=cubelet-' + block.getBlockType().name, 'hardwareVersion=' + block.getHardwareVersion().toString(), 'bootloaderVersion=' + block.getBootloaderVersion().toString(), 'applicationVersion=' + block.getApplicationVersion().toString()].join('&')
		};

		makeRequest(cacheKey, options, callback, false)
	}

	function makeRequest(cacheKey, options, callback, replace)
	{
		var cachedResult = getCachedValue(cacheKey)
		if(cachedResult){
			cachedResult.cacheHit = true;
			callback(null, cachedResult)
			return
		}
		if(typeof jQuery !== 'undefined'){
			var url = options.host+":"+options.port+options.path
			url = "http://"+url;
			jQuery.getJSON(url, function(result){
				if(replace)
				{
					result.hexBlob = result.bootloaderHexBlob;
					delete result.bootloaderHexBlob;
				}
				 setCachedValue(cacheKey, result);
				 callback(null, result)
			}).fail(function(){
				callback(new Error('Failed to make request to the firmware service.'))
			})
		}
		else if(typeof XMLHttpRequest != "undefined")
		{//We are likely running in the browser/cordova, use XMLHttpRequest
			var url = options.host+":"+options.port+options.path
			var request = new XMLHttpRequest()
			url = "http://"+url;
			request.open('GET', url, true)
			request.onreadystatechange = function() {
				if (request.readyState === 4 && request.status === 200) {
					try {
						var json = JSON.parse(request.responseText);
						if(replace)
						{
							json.hexBlob = json.bootloaderHexBlob;
							delete json.bootloaderHexBlob;
						}
						setCachedValue(cacheKey, json);
						callback(null, json)
					} catch (e) {
						callback(e)
					}
				}
			}
			request.onerror = function(){
				callback(new Error('Unable to fetch latest firmware, check internet connection'))
			}
			request.send();
		}
		else
		{//We are likely running in pure node, use a node library
			var http = require('http');
			http.get(options, function(res) {
				var body = '';
				res.on('data', function(chunk) {
					body += chunk;
				});
				res.on('end', function() {
					try {
						var json = JSON.parse(body);
						if(replace)
						{
							json.hexBlob = json.bootloaderHexBlob;
							delete json.bootloaderHexBlob;
						}
						setCachedValue(cacheKey, json);
						callback(null, json)
					} catch (e) {
						callback(e)
					}
				});
			});
		}
	}

	this.checkForBootloaderUpdate = function(block, callback) {
		if (!block || !block.getBlockType() || block.getBlockType().name == "unknown") {
			callback(new Error("Invalid block type provided"))
			return
		} else if (!block.getHardwareVersion() || !block.getBootloaderVersion()) {
			callback(new Error("Invalid versions provided"))
			return;
		}

		var product = 'cubelet-' + block.getBlockType().name;
		var hardwareVersion = block.getHardwareVersion().toString();
		var bootloaderVersion = block.getBootloaderVersion().toString();
		var cacheKey = product+'-bootloader'+'-'+hardwareVersion+'-'+bootloaderVersion;
		var cachedResult = getCachedValue(cacheKey)

		if(cachedResult){
			cachedResult.cacheHit = true;
			callback(null, cachedResult)
			return
		}

		var options = {
			host : baseUrl,
			port : 80,
			path : '/getLatestBootloader?' + ['platform=cubelets', 'product=cubelet-' + block.getBlockType().name, 'hardwareVersion=' + block.getHardwareVersion().toString(), 'bootloaderVersion=' + block.getBootloaderVersion().toString()].join('&')
		};

		makeRequest(cacheKey, options, callback, false)
	}

	this.fetchLatestHex = function(block, callback) {
		block._applicationVersion = new Version(0, 0, 0)
		this.checkForUpdate(block, callback)
	}

	function verifyForBootloader(block, callback)
	{
		if (!block || !block.getBlockType() || block.getBlockType().name == "unknown") {
			callback(new Error("Invalid block type provided"))
			return false;
		} else if (!block.getHardwareVersion() || !block.getBootloaderVersion()) {
			callback(new Error("Invalid versions provided"))
			return false;
		}
		return true;
	}

	function getLatestHexBlob(product, hardwareVersion, cacheKey, callback)
	{
		var cachedResult = getCachedValue(cacheKey)

		if(cachedResult){
			cachedResult.cacheHit = true;
			callback(null, cachedResult)
			return
		}

		var options = {
			host : baseUrl,
			port : 80,
			path : '/getLatestBootloader?' + [	'platform=cubelets',
																					'product=' + product,
																					'hardwareVersion=' + hardwareVersion,
																					'bootloaderVersion=' + '0.0.0'].join('&')
		};

		makeRequest(cacheKey, options, callback, true)
	}
	function getCachedValue(cacheKey)
	{
		value = firmwareCache.get( cacheKey );
		return value;
	}
	function setCachedValue(cacheKey, value)
	{
		firmwareCache.set( cacheKey, value, 10000 );
	}

	this.fetchBootstrapFirmware = function(block, callback) {
		if(!verifyForBootloader(block, callback))
		{
			return;
		}

		var product = 'cubelet-' + block.getBlockType().name+'-bootstrap';
		var hardwareVersion = block.getHardwareVersion().toString();
		var cacheKey = product+'-'+hardwareVersion;
		getLatestHexBlob(product, hardwareVersion, cacheKey, callback)
	}

	this.fetchTypeSwitchApplication = function(block, callback) {
		if(!verifyForBootloader(block, callback))
		{
			return;
		}

		var product = 'cubelet-' + block.getBlockType().name+'-typeswitch';
		var hardwareVersion = block.getHardwareVersion().toString();
		var cacheKey = product+'-'+hardwareVersion;
		getLatestHexBlob(product, hardwareVersion, cacheKey, callback)
	}

	this.fetchMajorUpdateBootstrap = function(block, callback) {
		if(!verifyForBootloader(block, callback))
		{
			return;
		}

		var product = 'cubelet-' + block.getBlockType().name+'-modbootstrap';
		var hardwareVersion = block.getHardwareVersion().toString();
		var cacheKey = product+'-'+hardwareVersion;
		getLatestHexBlob(product, hardwareVersion, cacheKey, callback)
	}
	this.fetchDeepMemoryBootloader = function(block, callback) {
		var product = 'cubelet-deep-memory-bootloader';
		var hardwareVersion = new Version(2,0,0)
		var cacheKey = product+'-'+hardwareVersion;
		getLatestHexBlob(product, hardwareVersion, cacheKey, callback)
	}
}

module.exports = ImagoFirmwareService
