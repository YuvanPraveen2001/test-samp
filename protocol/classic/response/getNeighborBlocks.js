var util = require('util')
var Message = require('../message')

var GetNeighborBlocksResponse = function (neighbors, originBlockId) {
  Message.call(this)
  this.neighbors = neighbors || {}
  this.originBlockId = originBlockId
}

util.inherits(GetNeighborBlocksResponse, Message)

GetNeighborBlocksResponse.prototype.decodeBody = function (body) {
  this.neighbors = {}
  this.originBlockId = undefined

  if (body.length === 0) {
    return true
  }

  if (body.length % 3 !== 0) {
    this.error = new Error('Size should be divisible by 3 but is', body.length, 'bytes.')
    return false
  }

  var neighbors = {}
  var originBlockId
  var count = body.length / 3
  for (var i = 0; i < count; ++i) {
    var p = i * 3
    var blockId = Message.Decoder.decodeId(body.slice(p + 0, p + 3))
    if (i === 0) {
      originBlockId = blockId
    } else {
      var faceIndex = i - 1
      if (0 !== blockId) {
        neighbors[faceIndex] = blockId
      }
    }
  }

  this.neighbors = neighbors
  this.originBlockId = originBlockId
  return true
}

module.exports = GetNeighborBlocksResponse
