var util = require('util')
var Message = require('../message')

var KeepAliveRequest = function () {
  Message.call(this)
}

util.inherits(KeepAliveRequest, Message)

module.exports = KeepAliveRequest
