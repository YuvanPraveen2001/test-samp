var util = require('util')
var Message = require('../message')

var GetNeighborBlocksRequest = function () {
  Message.call(this)
}

util.inherits(GetNeighborBlocksRequest, Message)

module.exports = GetNeighborBlocksRequest
