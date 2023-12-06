var util = require('util')
var Message = require('../message')

var GetNeighborsRequest = function (blockId) {
  Message.call(this, blockId)
}

util.inherits(GetNeighborsRequest, Message)

module.exports = GetNeighborsRequest
