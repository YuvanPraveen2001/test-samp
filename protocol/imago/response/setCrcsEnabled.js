var util = require('util')
var Message = require('../message')

var SetCrcsResponse = function () {
  Message.call(this)
}

util.inherits(SetCrcsResponse, Message)

SetCrcsResponse.prototype.decodeBody = function (body) {
  return true
}

module.exports = SetCrcsResponse
