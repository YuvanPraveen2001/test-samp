var util = require('util')
var Message = require('../message')

var ErrorEvent = function (errorCode, messageCode) {
  Message.call(this)
  this.errorCode = errorCode
  this.messageCode = messageCode
}

util.inherits(ErrorEvent, Message)

ErrorEvent.prototype.decodeBody = function (body) {
  if (body.length > 0) {
    this.errorCode = body.readUInt8(0)
  }

  if (body.length > 1) {
    this.messageCode = body.readUInt8(1)
  }

  return true
}

module.exports = ErrorEvent
