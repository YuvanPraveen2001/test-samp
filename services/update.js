var debug = require('debug')('cubelets:infoService')
var util = require('util')
var events = require('events')
var request = require('request')
var config = require('../config.json')
var keys = require('../keys.json')
var Version = require('../version')
var __ = require('underscore')


function UpdateService() {
  events.EventEmitter.call(this)

  var service = this
  var baseUrl = config['urls']['update']

  this.setBlockUpdated = function (id, val, callback) {
  	var hasOS4 = val ? 1 : 0;
	var requestUrl = baseUrl+'/api/set_os4_updated/?admin_key='+keys['appEngine']['adminId']+'&block_id='+id+'&hasOS4='+hasOS4
	request.get({
        url: requestUrl,
        json: true
      }, function (err, res, body) {
      	if (err) {
          if (callback) {
            callback(err)
          }
        }
        if(body['status'] !== 'success' && callback)
        {
        	callback(body['status_message'])
        }
        else if(callback)
        {
        	callback(null)
        }      
    });	
  }
}

util.inherits(UpdateService, events.EventEmitter)
module.exports = UpdateService
