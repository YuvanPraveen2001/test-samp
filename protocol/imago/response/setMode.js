var util = require('util')
var Message = require('../message')

var SetModeResponse = function (mode) {
  Message.call(this)
  this.mode = mode
}

util.inherits(SetModeResponse, Message)

SetModeResponse.prototype.decodeBody = function (body) {
  if (body.length !== 1) {
    this.error = new Error('Size should be 1 byte but is', body.length, 'bytes.')
    return false
  }

  this.mode = body.readUInt8(0)
  return true
}

module.exports = SetModeResponse
