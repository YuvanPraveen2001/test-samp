var util = require('util')
var Message = require('../message')
var BlockProtocol = require('../block')

var ReadBlockMessageEvent = function (blockMessage) {
  Message.call(this)
  this.blockMessage = blockMessage
}

util.inherits(ReadBlockMessageEvent, Message)

ReadBlockMessageEvent.prototype.decodeBody = function (body) {
  if (body.length < 5) {
    this.error = new Error('Size should be at least 5 bytes but is', body.length, 'bytes.')
    return false
  }

  var code = body.readUInt8(0)
  var type = BlockProtocol.typeForCode(code)
  if (!type) {
    this.error = new Error('Invalid block message type.')
    return false
  }

  var blockId = Message.Decoder.decodeId(body.slice(1, 4))
  this.blockMessage = new type(blockId)

  var size = body.readUInt8(4)
  var byteCount = body.length - 5 
  if (size !== byteCount) {
    this.error = new Error('Block message size should be', size, 'bytes but is', byteCount, 'bytes.')
    return false
  }

  var body = body.slice(5, 5 + size)
  return this.blockMessage.decodeBody(body)
}

ReadBlockMessageEvent.prototype.encodeBody = function () {
  return this.blockMessage.encode()
}

module.exports = ReadBlockMessageEvent
