var util = require('util')
var Message = require('../message')

var SetLEDRGBCommand = function (r, g, b) {
  Message.call(this)
  this.r = r
  this.g = g
  this.b = b
};

util.inherits(SetLEDRGBCommand, Message)

SetLEDRGBCommand.prototype.encodeBody = function () {
  return new Buffer([
    this.r, this.g, this.b
  ])
}

module.exports = SetLEDRGBCommand
