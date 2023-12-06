var util = require('util')
var Message = require('../message')

var FlashProgressEvent = function () {
  Message.call(this)
}

util.inherits(FlashProgressEvent, Message)

FlashProgressEvent.prototype.decodeBody = function (body) {
  if (body.length !== 1) {
    this.error = new Error('Size should be 1 byte but is', body.length, 'bytes.')
    return false
  }

  this.progress = body.readUInt8(0)
  return true
}

module.exports = FlashProgressEvent
