var util = require('util')
var Message = require('../message')

var BlockAddedEvent = function (blockId, hopCount, faceIndex, blockTypeId) {
  Message.call(this)
  this.blockId = blockId
  this.hopCount = hopCount
  this.faceIndex = faceIndex
  this.blockTypeId = blockTypeId
}

util.inherits(BlockAddedEvent, Message)

BlockAddedEvent.prototype.encodeBody = function () {
  return Buffer.concat([
    Message.Encoder.encodeId(this.blockId),
    new Buffer([
      this.hopCount,
      this.faceIndex,
      this.blockTypeId
    ])
  ])
}

BlockAddedEvent.prototype.decodeBody = function (body) {
  if (body.length !== 6) {
    this.error = new Error('Size should be 6 bytes but is', body.length, 'bytes.')
    return false
  }

  this.blockId = Message.Decoder.decodeId(body)
  this.hopCount = body.readUInt8(3)
  this.faceIndex = body.readUInt8(4)
  this.blockTypeId = body.readUInt8(5)
  return true
}

module.exports = BlockAddedEvent
