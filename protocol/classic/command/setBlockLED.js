var util = require('util')
var Message = require('../message')

var SetBlockLEDCommand = function (blockId, enable) {
  Message.call(this)
  this.blockId = blockId
  this.enable = enable
}

util.inherits(SetBlockLEDCommand, Message)

SetBlockLEDCommand.prototype.encodeBody = function () {
  var encodedId = Message.Encoder.encodeId(this.blockId)
  return new Buffer([
    (this.enable ? 'v' : 'z').charCodeAt(0),
    encodedId.readUInt8(0),
    encodedId.readUInt8(1),
    encodedId.readUInt8(2)
  ])
}

module.exports = SetBlockLEDCommand
