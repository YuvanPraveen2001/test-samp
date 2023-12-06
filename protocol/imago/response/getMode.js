var util = require('util')
var Message = require('../message')

var GetModeResponse = function (mode) {
  Message.call(this)
  this.mode = mode
}

util.inherits(GetModeResponse, Message)

GetModeResponse.prototype.encodeBody = function () {
  return new Buffer([
    this.mode
  ])
}

GetModeResponse.prototype.decodeBody = function (body) {
  if (body.length !== 1) {
    this.error = new Error('Size should be 1 byte but is', body.length, 'bytes.')
    return false
  }

  this.mode = body.readUInt8(0)
  return true
}

module.exports = GetModeResponse
