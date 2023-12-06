var util = require('util')
var ResultResponse = require('./result')

var SetBlockValueResponse = function (result) {
  ResultResponse.call(this, result)
}

util.inherits(SetBlockValueResponse, ResultResponse)

module.exports = SetBlockValueResponse
