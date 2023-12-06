var util = require('util')
var Message = require('../message')

var GetNeighborsResponse = function (blockId, neighbors) {
  Message.call(this, blockId)
  this.neighbors = neighbors || {}
}

util.inherits(GetNeighborsResponse, Message)

GetNeighborsResponse.prototype.encodeBody = function () {
  var faceMask = 0x0

  for (var i = 0; i < 6; ++i) {
    var neighbor = this.neighbors[i]
    if (neighbor) {
      faceMask |= (1 << i)
    }
  }

  var body = new Buffer([ faceMask ])
  for (var i = 0; i < 6; ++i) {
    var blockId = this.neighbors[i]
    body = Buffer.concat([ body, blockId ?
      Message.Encoder.encodeId(blockId) :
      Message.Encoder.encodeId(0)
    ])
  }

  return body
}

GetNeighborsResponse.prototype.decodeBody = function (body) {
  this.neighbors = {}

  if (body.length < 1) {
    this.error = new Error('Size should be at least 1 byte.')
    return false
  }

  var faceMask = body.readUInt8(0)

  if ((body.length - 1) % 3 !== 0) {
    this.error = new Error('Size of blockId sequence should be a multiple of 3 bytes.')
    return false
  }

  var neighbors = {}

  for (var i = 0; i < 6; ++i) {
    if (faceMask & (1 << i)) {
      var p = 1 + i * 3
      neighbors[i] = Message.Decoder.decodeId(body.slice(p + 0, p + 3))
    }
  }

  this.neighbors = neighbors
  return true
}

module.exports = GetNeighborsResponse
