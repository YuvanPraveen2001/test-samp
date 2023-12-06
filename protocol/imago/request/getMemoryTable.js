var util = require('util')
var Message = require('../message')

var GetMemoryTableRequest = function () {
  Message.call(this)
}

util.inherits(GetMemoryTableRequest, Message)

module.exports = GetMemoryTableRequest
