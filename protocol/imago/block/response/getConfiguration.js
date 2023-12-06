var util = require('util')
var Message = require('../message')

var GetConfigurationResponse = function (blockId) {
  Message.call(this, blockId)
}

util.inherits(GetConfigurationResponse, Message)

GetConfigurationResponse.prototype.encodeBody = function () {
  return Buffer.concat([
    Message.Encoder.encodeVersion(this.hardwareVersion),
    Message.Encoder.encodeVersion(this.bootloaderVersion),
    Message.Encoder.encodeVersion(this.applicationVersion),
    new Buffer([
      this.blockTypeId,
      this.mode,
      this.customApplication
    ])
  ])
}

GetConfigurationResponse.prototype.decodeBody = function (body) {
  if (body.length !== 12) {
    this.error = new Error('Size should be 12 bytes but is', body.length, 'bytes.')
    return false
  }

  this.hardwareVersion = Message.Decoder.decodeVersion(body.slice(0, 3))
  this.bootloaderVersion = Message.Decoder.decodeVersion(body.slice(3, 6))
  this.applicationVersion = Message.Decoder.decodeVersion(body.slice(6, 9))
  this.blockTypeId = body.readUInt8(9)
  this.mode = body.readUInt8(10)
  this.customApplication = body.readUInt8(11)
  this.hasCustomApplication = (this.customApplication !== 0)
  return true
}

module.exports = GetConfigurationResponse
