var util = require('util')
var Message = require('../message')

var UnregisterBlockValueEventCommand = function (blockId) {
  Message.call(this)
  this.blockId = blockId
}

util.inherits(UnregisterBlockValueEventCommand, Message)

UnregisterBlockValueEventCommand.prototype.encodeBody = function () {
  return Message.Encoder.encodeId(this.blockId)
}

module.exports = UnregisterBlockValueEventCommand
