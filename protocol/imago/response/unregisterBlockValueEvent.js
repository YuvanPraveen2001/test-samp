var util = require('util')
var ResultResponse = require('./result')

var UnregisterBlockValueEventResponse = function (result) {
  ResultResponse.call(this, result)
}

util.inherits(UnregisterBlockValueEventResponse, ResultResponse)

module.exports = UnregisterBlockValueEventResponse
