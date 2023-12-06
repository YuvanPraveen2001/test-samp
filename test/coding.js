var test = require('tape')
var cubelets = require('../index')()
var Protocol = cubelets.Protocol
var Version = cubelets.Version

test('messages', function (t) {
  t.plan(8)

  var slot = 3
  var programSize = 1337
  var blockType = 42
  var version = new Version(7, 5, 3)
  var isCustom = true
  var crc = 84

  var msg, body
  msg = new Protocol.messages.UploadToMemoryRequest(slot, programSize, blockType, version, isCustom, crc)
  body = msg.encodeBody()
  t.equal(body[0], slot)
  t.equal(body.readUInt16BE(1), programSize)
  t.equal(body[3], blockType)
  t.equal(body[4], version.major)
  t.equal(body[5], version.minor)
  t.equal(body[6], version.patch)
  t.equal(body[7], 1)
  t.equal(body[8], crc)
})
