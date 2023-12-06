var util = require('util')
var Message = require('../message')

var SetLEDColorCommand = function (color) {
  Message.call(this)
  this.color = color
};

util.inherits(SetLEDColorCommand, Message)

SetLEDColorCommand.prototype.encodeBody = function () {
  return new Buffer([
    this.color
  ])
}

module.exports = SetLEDColorCommand
