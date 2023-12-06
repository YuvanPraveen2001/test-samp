var util = require('util')
var Message = require('../message')

var GetMemoryTableResponse = function (slots) {
  Message.call(this)
  this.slots = slots
}

util.inherits(GetMemoryTableResponse, Message)

GetMemoryTableResponse.prototype.decodeBody = function (body) {
  if (body.length < 4) {
    this.error = new Error('Size should be at least 4 bytes.')
    return false
  }

  var mask = body.readUInt32BE(0)
  var slotsLength = body.length - 4

  if (slotsLength % 7 !== 0) {
    this.error = new Error('Slots size should be divisible by 7.')
    return false
  }

  var slots = {}
  var count = slotsLength / 7
  var p = 4
  for (var i = 0; i < 32; ++i) {
    if (mask & (1 << i)) {
      /* format: [ t, sz1, sz0, v2, v1, v0, c ] */
      slots[i] = {
        blockTypeId: body.readUInt8(p + 0),
        slotSize: body.readUInt16BE(p + 1),
        version: Message.Decoder.decodeVersion(body.slice(p + 3, p + 6)),
        isCustom: body.readUInt8(p + 6) ? true : false
      }
      p += 7
    }
  }

  this.slots = slots
  return true
}

module.exports = GetMemoryTableResponse
