var util = require('util')
var ResultResponse = require('./result')

var UploadToMemoryResponse = function (result) {
  ResultResponse.call(this, result)
}

util.inherits(UploadToMemoryResponse, ResultResponse)

module.exports = UploadToMemoryResponse
