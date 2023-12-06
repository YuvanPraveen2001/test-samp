var util = require('util')
var events = require('events')
var request = require('request')
var config = require('../config.json')
var __ = require('underscore')
var keys = require('../keys.json')

function IdService() {
	events.EventEmitter.call(this)

	var service = this
	var baseUrl = config['urls']['kit']

	service.addId = function(block, version, callback) {
		var requestUrl = baseUrl + '/api/assembly_add?'

		var data = {
			'admin_key' : keys['appEngine']['adminId'],
			'block_id' : block.getBlockId(),
			'mcu_type' : 'pic',
			'hardware' : 'pic16',
			'core_version' : 1,
			'cubelet_version' : 1,
			'allow_overwrite' : 1,
			'firm_ver' : version,
			'block_type' : block.getBlockType().typeId
		}

		request({
			url : requestUrl,
			qs : data
		}, function(err, response, body) {
			if (err) {
				callback(err)
				return;
			}
			callback()
		});
	}
}

util.inherits(IdService, events.EventEmitter)
module.exports = IdService
