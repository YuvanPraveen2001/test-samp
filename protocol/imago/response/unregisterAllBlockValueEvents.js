var util = require('util')
var ResultResponse = require('./result')

var UnregisterAllBlockValueEventsResponse = function (result) {
  ResultResponse.call(this, result)
}

util.inherits(UnregisterAllBlockValueEventsResponse, ResultResponse)

module.exports = UnregisterAllBlockValueEventsResponse
