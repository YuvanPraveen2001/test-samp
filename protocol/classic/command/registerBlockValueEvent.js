var util = require('util')
var Message = require('../message')

var RegisterBlockValueEventCommand = function (blockId) {
  Message.call(this)
  this.blockId = blockId
}

util.inherits(RegisterBlockValueEventCommand, Message)

RegisterBlockValueEventCommand.prototype.encodeBody = function () {
  return Message.Encoder.encodeId(this.blockId)
}

module.exports = RegisterBlockValueEventCommand
