var util = require('util')
var Message = require('../message')

var UnregisterAllBlockValueEvents = function () {
  Message.call(this)
}

util.inherits(UnregisterAllBlockValueEvents, Message)

module.exports = UnregisterAllBlockValueEvents
