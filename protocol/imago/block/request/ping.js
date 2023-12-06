var util = require('util')
var Message = require('../message')

var PingRequest = function (blockId, payload) {
  Message.call(this, blockId)
  this.payload = payload || new Buffer(0)
}

util.inherits(PingRequest, Message)

PingRequest.prototype.encodeBody = function () {
  return this.payload
}

PingRequest.prototype.decode = function (body) {
  this.payload = body
  return true
}

module.exports = PingRequest
