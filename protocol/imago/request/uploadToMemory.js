var util = require('util')
var Message = require('../message')

var UploadToMemoryRequest = function (slotIndex, slotSize, blockTypeId, version, isCustom, crc) {
  Message.call(this)
  this.slotIndex = slotIndex
  this.slotSize = slotSize
  this.blockTypeId = blockTypeId
  this.version = version
  this.isCustom = isCustom
  this.crc = crc
}

util.inherits(UploadToMemoryRequest, Message)

UploadToMemoryRequest.prototype.encodeBody = function () {
  var body = new Buffer(9)
  body.writeUInt8(this.slotIndex, 0)
  body.writeUInt16BE(this.slotSize, 1)
  body.writeUInt8(this.blockTypeId, 3)
  Message.Encoder.encodeVersion(this.version).copy(body, 4, 0)
  body.writeUInt8(this.isCustom ? 1 : 0, 7)
  body.writeUInt8(this.crc, 8)
  return body
}

UploadToMemoryRequest.prototype.decodeBody = function (body) {
  if (body.length !== 9) {
    this.error = new Error('Size should be 9 bytes but is', body.length, 'bytes.')
    return false
  }

  this.slotIndex = body.readUInt8(0)
  this.slotSize = body.readUInt16BE(1)
  this.blockTypeId = body.readUInt8(3)
  this.version = Message.Decoder.decodeVersion(body.slice(body.slice(4, 7)))
  this.isCustom = body.readUInt8(7)
  this.crc = body.readUInt8(8)
  return true
}

module.exports = UploadToMemoryRequest
