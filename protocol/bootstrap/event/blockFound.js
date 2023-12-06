var util = require('util')
var Message = require('../../imago/message')

var BlockFoundEvent = function (faceIndex, firmwareType) {
  Message.call(this)
  this.faceIndex = faceIndex
  this.firmwareType = firmwareType
}

util.inherits(BlockFoundEvent, Message)

BlockFoundEvent.prototype.decodeBody = function (body) {
  if (body.length !== 2) {
    this.error = new Error('Size should be 2 bytes but is', body.length, 'bytes.')
    return false
  }

  this.faceIndex = body.readUInt8(0)
  this.firmwareType = body.readUInt8(1)
  return true
}

module.exports = BlockFoundEvent
