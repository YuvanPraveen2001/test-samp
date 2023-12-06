var util = require('util')
var Message = require('../message')

var GetAllBlocksResponse = function (blocks) {
  Message.call(this)
  this.blocks = blocks || []
}

util.inherits(GetAllBlocksResponse, Message)

GetAllBlocksResponse.prototype.decodeBody = function (body) {
  this.blocks = []

  if (body.length === 0) {
    return true
  }

  if (body.length % 7 !== 0) {
    this.error = new Error('Size should be divisible by 7 but is', body.length, 'bytes.')
    return false
  }

  var blocks = []
  var count = body.length / 7
  for (var i = 0; i < count; ++i) {
    var p = i * 7
    /* format: [ id2, id1, id0, blockValue, hc, timeout, packetType ] */
    blocks.push({
      blockId: Message.Decoder.decodeId(body.slice(p + 0, p + 3)),
      value: body.readUInt8(p + 3),
      hopCount: body.readUInt8(p + 4)
    })
  }

  this.blocks = blocks
  return true
}

module.exports = GetAllBlocksResponse
