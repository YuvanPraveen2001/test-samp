var util = require('util')
var Message = require('../../imago/message')

var DisconnectFailedEvent = function () {
  Message.call(this)
}

util.inherits(DisconnectFailedEvent, Message)

module.exports = DisconnectFailedEvent
