var util = require('util')
var Message = require('../message')

var SetBlockValueCommand = function (blockId, value) {
  Message.call(this)
  this.blockId = blockId
  this.value = value
}

util.inherits(SetBlockValueCommand, Message)

SetBlockValueCommand.prototype.encodeBody = function () {
  var encodedId = Message.Encoder.encodeId(this.blockId)
  return new Buffer([
    this.value,
    encodedId.readUInt8(0),
    encodedId.readUInt8(1),
    encodedId.readUInt8(2)
  ])
}

module.exports = SetBlockValueCommand
