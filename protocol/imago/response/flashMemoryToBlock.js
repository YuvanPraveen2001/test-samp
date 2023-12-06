var util = require('util')
var ResultResponse = require('./result')

var FlashMemoryToBlockResponse = function (result) {
  ResultResponse.call(this, result)
}

util.inherits(FlashMemoryToBlockResponse, ResultResponse)

module.exports = FlashMemoryToBlockResponse
