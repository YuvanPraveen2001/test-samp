var util = require('util')
var Message = require('../message')

var SetConnectionIntervalRequest = function (min, max, connectionLatency, supervisorTimeout) {
  Message.call(this)
  this.min = min
  this.max = max
  this.connectionLatency = connectionLatency
  this.supervisorTimeout = supervisorTimeout
}

util.inherits(SetConnectionIntervalRequest, Message)

SetConnectionIntervalRequest.prototype.encodeBody = function () {
  return new Buffer([
    this.min,
    this.max,
    this.connectionLatency,
    this.supervisorTimeout
  ])
}

module.exports = SetConnectionIntervalRequest
