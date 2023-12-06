var util = require('util')
var Message = require('../message')

var FlashCompleteEvent = function () {
  Message.call(this)
}

util.inherits(FlashCompleteEvent, Message)

FlashCompleteEvent.prototype.decodeBody = function (body) {
  return true
}

module.exports = FlashCompleteEvent
