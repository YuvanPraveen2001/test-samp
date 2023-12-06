var util = require('util')
var Message = require('../message')
var __ = require('underscore')

var ClearBlockValueCommand = function (blocks) {
  Message.call(this)
  this.blocks = blocks
}

util.inherits(ClearBlockValueCommand, Message)

ClearBlockValueCommand.prototype.encodeBody = function () {
  return Buffer.concat(__(this.blocks).map(function (block) {
    return Message.Encoder.encodeId(block.blockId)
  }))
}

module.exports = ClearBlockValueCommand
