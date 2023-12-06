var util = require('util')
var Message = require('../message')
var __ = require('underscore')

var SetBlockValueCommand = function (blocks) {
  Message.call(this)
  this.blocks = blocks
}

util.inherits(SetBlockValueCommand, Message)

SetBlockValueCommand.prototype.encodeBody = function () {
  return Buffer.concat(__(this.blocks).map(function (block) {
    return Buffer.concat([
      Message.Encoder.encodeId(block.blockId),
      new Buffer([ block.value ])
    ])
  }))
}

SetBlockValueCommand.prototype.prioritize = function (otherCommand) {
  if (otherCommand instanceof SetBlockValueCommand) {
    function blockIds(blocks) {
      return __(blocks).map(function (block) {
        return __(block).pick('blockId')
      })
    }
    return __.isEqual(blockIds(this.blocks), blockIds(otherCommand.blocks))
  } else {
    return 0
  }
}

module.exports = SetBlockValueCommand
