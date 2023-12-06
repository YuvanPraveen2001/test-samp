var util = require('util')
var Message = require('../../imago/message')

var SkipDisconnectEvent = function () {
  Message.call(this)
}

util.inherits(SkipDisconnectEvent, Message)

module.exports = SkipDisconnectEvent
