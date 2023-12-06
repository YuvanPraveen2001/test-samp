var util = require('util')
var Message = require('../message')

var SetLEDCommand = function (blockId, enable) {
  Message.call(this, blockId)
  this.enable = enable
}

util.inherits(SetLEDCommand, Message)

SetLEDCommand.prototype.encodeBody = function () {
  return new Buffer([ this.enable ? 1 : 0 ])
}

module.exports = SetLEDCommand
