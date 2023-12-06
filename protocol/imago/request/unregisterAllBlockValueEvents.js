var util = require('util')
var Message = require('../message')

var UnregisterAllBlockValueEventsRequest = function () {
  Message.call(this)
}

util.inherits(UnregisterAllBlockValueEventsRequest, Message)

module.exports = UnregisterAllBlockValueEventsRequest
