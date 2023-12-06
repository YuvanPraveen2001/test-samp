var util = require('util')
var Message = require('../message')

var GetBlockValueResponse = function (blockId, value, result) {
  Message.call(this)
  this.blockId = blockId
  this.value = value
  this.result = result
}

util.inherits(GetBlockValueResponse, Message)

GetBlockValueResponse.prototype.decodeBody = function (body) {
  if (body.length !== 5) {
    this.error = new Error('Size should be 5 bytes but is', body.length, 'bytes.')
    return false
  }

  this.blockId = Message.Decoder.decodeId(body.slice(0, 3))
  this.value = body.readUInt8(3)
  this.result = body.readUInt8(4)
  return true
}

module.exports = GetBlockValueResponse
