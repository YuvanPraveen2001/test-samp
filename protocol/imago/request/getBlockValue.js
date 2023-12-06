var util = require('util')
var Message = require('../message')

var GetBlockValueRequest = function (blockId) {
  Message.call(this)
  this.blockId = blockId
}

util.inherits(GetBlockValueRequest, Message)

GetBlockValueRequest.prototype.encodeBody = function () {
  return Message.Encoder.encodeId(this.blockId)
}

module.exports = GetBlockValueRequest
