var util = require('util')
var Message = require('../message')

var SetCrcsRequest = function (enabled) {
  Message.call(this)
  this.enabled = enabled
}

util.inherits(SetCrcsRequest, Message)

SetCrcsRequest.prototype.encodeBody = function () {
  return new Buffer([
    this.enabled
  ])
}

module.exports = SetCrcsRequest
