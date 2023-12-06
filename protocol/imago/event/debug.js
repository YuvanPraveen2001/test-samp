var util = require('util')
var Message = require('../message')

var DebugEvent = function (data) {
  Message.call(this)
  this.data = data
}

util.inherits(DebugEvent, Message)

DebugEvent.prototype.decodeBody = function (body) {
  console.log('DEBUG',
    ((this.data = body))
  ); return true
}

module.exports = DebugEvent
