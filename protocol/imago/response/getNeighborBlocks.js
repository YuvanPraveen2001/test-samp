var util = require('util')
var Message = require('../message')
var __ = require('underscore')

var GetNeighborBlocksResponse = function (neighbors) {
  Message.call(this)
  this.neighbors = neighbors || {}
}

util.inherits(GetNeighborBlocksResponse, Message)

GetNeighborBlocksResponse.prototype.encodeBody = function () {
  var body = new Buffer([])
  __(this.neighbors).each(function (blockId, faceIndex) {
    body = Buffer.concat([ body,
      Message.Encoder.encodeId(blockId),
      new Buffer([ faceIndex ])
    ])
  })
  return body
}

GetNeighborBlocksResponse.prototype.decodeBody = function (body) {
  this.neighbors = {}

  if (body.length === 0) {
    return true
  }

  if (body.length % 4 !== 0) {
    this.error = new Error('Size should be divisible by 4 but is', body.length, 'bytes.')
    return false
  }

  var neighbors = {}
  var count = body.length / 4
  for (var i = 0; i < count; ++i) {
    var p = i * 4
    var blockId = Message.Decoder.decodeId(body.slice(p + 0, p + 3))
    var faceIndex = body.readUInt8(p + 3)
    neighbors[faceIndex] = blockId
  }

  this.neighbors = neighbors
  return true
}

module.exports = GetNeighborBlocksResponse
