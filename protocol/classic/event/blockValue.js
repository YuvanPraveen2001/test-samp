var util = require('util')
var Message = require('../message')

var BlockValueEvent = function (blockId, value) {
  Message.call(this)
  this.blockId = blockId
  this.value = value
}

util.inherits(BlockValueEvent, Message)

BlockValueEvent.prototype.decodeBody = function (body) {
  if (body.length != 4) {
    this.error = new Error('Size should be 4 bytes but is', body.length, 'bytes.')
    return false
  }

  this.blockId = Message.Decoder.decodeId(body.slice(0, 3))
  this.value = body.readUInt8(3)
  return true
}

module.exports = BlockValueEvent
