var util = require('util')
var Message = require('../message')

var GetConfigurationRequest = function () {
  Message.call(this)
}

util.inherits(GetConfigurationRequest, Message)

module.exports = GetConfigurationRequest
