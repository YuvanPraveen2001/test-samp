var util = require('util')
var Message = require('../message')
var __  = require('underscore')

var PathCommand = function (blockId, seq, loop) {
  Message.call(this, blockId)
  this.seq = seq
  this.loop = loop
}

util.inherits(PathCommand, Message)

PathCommand.prototype.encodeBody = function () {
  return Buffer.concat([]
    .concat(__(this.seq).map(Message.Encoder.encodeId))
    .concat([ new Buffer([ this.loop ? 1 : 0 ]) ]))
}

module.exports = PathCommand
