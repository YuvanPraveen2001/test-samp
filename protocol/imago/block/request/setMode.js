var util = require('util')
var Message = require('../message')

var SetModeRequest = function (blockId, mode) {
  Message.call(this, blockId)
  this.mode = mode
}

util.inherits(SetModeRequest, Message)

SetModeRequest.prototype.encodeBody = function () {
  return new Buffer([
    this.mode
  ])
}

SetModeRequest.prototype.decodeBody = function (body) {
  if (body.length !== 1) {
    this.error = new Error('Size should be 1 byte but is', body.length, 'bytes.')
    return false
  }

  this.mode = body.readUInt8(0)
  return true
}

module.exports = SetModeRequest
