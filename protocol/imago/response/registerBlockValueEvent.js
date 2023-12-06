var util = require('util')
var ResultResponse = require('./result')

var RegisterBlockValueEventResponse = function (result) {
  ResultResponse.call(this, result)
}

util.inherits(RegisterBlockValueEventResponse, ResultResponse)

module.exports = RegisterBlockValueEventResponse
