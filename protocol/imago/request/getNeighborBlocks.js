var util = require('util')
var Message = require('../message')

var GetNeighborBlocksRequest = function (hopCount) {
  Message.call(this)
  this.hopCount = hopCount ? hopCount : 1
}

util.inherits(GetNeighborBlocksRequest, Message)

GetNeighborBlocksRequest.prototype.encodeBody = function () {
  return (this.hopCount === 1) ?
    new Buffer(0) :
    new Buffer([ this.hopCount ])
}

GetNeighborBlocksRequest.prototype.decodeBody = function (body) {
  this.hopCount = body.length === 0 ? 0 : body[0]
  return true
}

module.exports = GetNeighborBlocksRequest
