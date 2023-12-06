var util = require('util')
var ResultResponse = require('./result')

var ClearBlockValueResponse = function (result) {
  ResultResponse.call(this, result)
}

util.inherits(ClearBlockValueResponse, ResultResponse)

module.exports = ClearBlockValueResponse
