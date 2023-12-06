var util = require('util')
var Message = require('../message')

var GetConfigurationRequest = function (blockId) {
  Message.call(this, blockId)
}

util.inherits(GetConfigurationRequest, Message)

module.exports = GetConfigurationRequest
