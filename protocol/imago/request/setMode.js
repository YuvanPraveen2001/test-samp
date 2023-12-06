var util = require('util')
var Message = require('../message')

var SetModeRequest = function (mode) {
  Message.call(this)
  this.mode = mode
}

util.inherits(SetModeRequest, Message)

SetModeRequest.prototype.encodeBody = function () {
  return new Buffer([
    this.mode
  ])
}

module.exports = SetModeRequest
