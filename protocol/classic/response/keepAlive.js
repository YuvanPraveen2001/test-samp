var util = require('util')
var Message = require('../message')

var KeepAliveResponse = function (payload) {
  Message.call(this)
  this.payload = payload
}

util.inherits(KeepAliveResponse, Message)

KeepAliveResponse.prototype.decodeBody = function (body) {
  this.payload = body
  return true
}

module.exports = KeepAliveResponse
