var util = require('util')
var Message = require('../message')

var FlashMemoryToBlockRequest = function (blockId, slotIndex) {
  Message.call(this)
  this.slotIndex = slotIndex
  this.blockId = blockId
}

util.inherits(FlashMemoryToBlockRequest, Message)

FlashMemoryToBlockRequest.prototype.encodeBody = function () {
  return Buffer.concat([
    new Buffer([ this.slotIndex ]),
    Message.Encoder.encodeId(this.blockId)
  ])
}

FlashMemoryToBlockRequest.prototype.decodeBody = function (body) {
  if (body.length !== 4) {
    this.error = new Error('Size should be 4 bytes but is', body.length, 'bytes.')
    return false
  }

  this.slotIndex = body.readUInt8(0)
  this.blockId = Message.Decoder.decodeId(body.slice(1, 4))
  return true
}

module.exports = FlashMemoryToBlockRequest
