var util = require('util')
var Message = require('../message')

var GetModeRequest = function () {
  Message.call(this)
}

util.inherits(GetModeRequest, Message)

module.exports = GetModeRequest
