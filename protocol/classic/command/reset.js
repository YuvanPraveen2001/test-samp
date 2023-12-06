var util = require('util')
var Message = require('../message')

var ResetCommand = function () {
  Message.call(this)
}

util.inherits(ResetCommand, Message)

module.exports = ResetCommand
