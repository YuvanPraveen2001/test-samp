var util = require('util')
var Message = require('../message')

var ClearBlockValueCommand = function (blockId) {
  Message.call(this)
  this.blockId = blockId
}

util.inherits(ClearBlockValueCommand, Message)

ClearBlockValueCommand.prototype.encodeBody = function () {
  var encodedId = Message.Encoder.encodeId(this.blockId)
  return new Buffer([
    0x0,
    encodedId.readUInt8(0),
    encodedId.readUInt8(1),
    encodedId.readUInt8(2)
  ])
}

module.exports = ClearBlockValueCommand
