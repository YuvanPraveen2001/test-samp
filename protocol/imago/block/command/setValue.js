var util = require('util')
var Message = require('../message')

var SetValueCommand = function (blockId, value) {
  Message.call(this, blockId)
  this.value = value
}

util.inherits(SetValueCommand, Message)

SetValueCommand.prototype.encodeBody = function () {
  return new Buffer([ this.value ])
}

module.exports = SetValueCommand
