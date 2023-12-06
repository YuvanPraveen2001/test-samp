var util = require('util')
var Message = require('../message')

var GetAllBlocksRequest = function () {
  Message.call(this)
}

util.inherits(GetAllBlocksRequest, Message)

module.exports = GetAllBlocksRequest
