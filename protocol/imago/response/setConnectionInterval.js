var util = require('util')
var Message = require('../message')

var SetConnectionIntervalResponse = function (status) {
  Message.call(this)
  this.status = status
}

util.inherits(SetConnectionIntervalResponse, Message)

SetConnectionIntervalResponse.prototype.decodeBody = function (body) {
  if (body.length !== 1) {
    this.error = new Error('Size should be 1 byte but is', body.length, 'bytes.')
    return false
  }

  this.status = body.readUInt8(0)
  return true
}

module.exports = SetConnectionIntervalResponse
