var util = require('util')
var Message = require('../message')

var RegisterBlockValueEventRequest = function (blockId) {
  Message.call(this)
  this.blockId = blockId
}

util.inherits(RegisterBlockValueEventRequest, Message)

RegisterBlockValueEventRequest.prototype.encodeBody = function () {
  return Message.Encoder.encodeId(this.blockId)
}

RegisterBlockValueEventRequest.prototype.decodeBody = function (body) {
  if (body.length !== 3) {
    this.error = new Error('Size should be 3 bytes but is', body.length, 'bytes.')
    return false
  }

  this.blockId = Message.Decoder.decodeId(body)
  return true
}

module.exports = RegisterBlockValueEventRequest
