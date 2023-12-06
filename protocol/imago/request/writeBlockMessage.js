var util = require('util')
var Message = require('../message')
var ReadBlockMessageEvent = require('../event/readBlockMessage')

var WriteBlockMessageRequest = function (blockMessage) {
  Message.call(this)
  this.blockMessage = blockMessage
}

util.inherits(WriteBlockMessageRequest, Message)

WriteBlockMessageRequest.prototype.decodeBody = function (body) {
  // HACK: Factor out to decoder.
  return ReadBlockMessageEvent.prototype.decodeBody.call(this, body)
}

WriteBlockMessageRequest.prototype.encodeBody = function () {
  return this.blockMessage.encode()
}

module.exports = WriteBlockMessageRequest
