var util = require('util')
var Message = require('../message')

var EchoResponse = function (echo) {
  Message.call(this)
  this.echo = echo
}

util.inherits(EchoResponse, Message)

EchoResponse.prototype.encodeBody = function () {
  return this.echo
}

EchoResponse.prototype.decodeBody = function (body) {
  this.echo = body
  return true
}

module.exports = EchoResponse
