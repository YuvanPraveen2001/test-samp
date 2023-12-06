var util = require('util')
var Message = require('../../imago/message')

var SetBootstrapModeRequest = function (mode) {
  Message.call(this)
  this.mode = mode
}

util.inherits(SetBootstrapModeRequest, Message)

SetBootstrapModeRequest.prototype.encodeBody = function () {
  return new Buffer([
    this.mode
  ])
}

module.exports = SetBootstrapModeRequest
