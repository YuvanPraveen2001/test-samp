var util = require('util')
var ResultResponse = require('./result')

var WriteBlockMessageResponse = function (result) {
  ResultResponse.call(this, result)
}

util.inherits(WriteBlockMessageResponse, ResultResponse)

module.exports = WriteBlockMessageResponse
