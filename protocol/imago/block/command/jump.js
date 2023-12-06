var util = require('util')
var Message = require('../message')

var JumpCommand = function (blockId, mode) {
  Message.call(this, blockId)
  this.mode = mode
}

util.inherits(JumpCommand, Message)

JumpCommand.prototype.encodeBody = function () {
  return new Buffer([ this.mode ])
}

module.exports = JumpCommand
