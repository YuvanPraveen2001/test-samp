var test = require('tape')
var cubelets = require('../index')()

test('can parse', function (t) {
  t.plan(8)

  var Protocol = cubelets.Protocol
  var parser = new Protocol.Parser()

  var message
  var count = 0
  parser.on('message', function (msg) {
    message = msg
    ++count
  })

  parser.on('extra', function (e) {
    t.fail('got extra data')
  })

  parser.parse(new Buffer([ '<'.charCodeAt(0) ]))
  t.equal(0, count)
  parser.parse(new Buffer([ Protocol.messages.EchoResponse.code ]))
  parser.parse(new Buffer([ 0x0E ]))
  t.equal(0, count)
  parser.parse(new Buffer([ '>'.charCodeAt(0) ]))
  t.equal(0, count)
  parser.parse(new Buffer([ 0,0,0,0,0,0,0,0,0,0,0,0,0 ]))
  t.equal(0, count)
  parser.parse(new Buffer([ 0 ]))
  t.equal(1, count)
  t.ok(message instanceof Protocol.messages.EchoResponse, 'is echo response')

  parser.parse(new Buffer([
    '<'.charCodeAt(0),
    0xE0,
    0x00,
    '>'.charCodeAt(0)
  ]))
  t.equal(2, count)
  t.ok(message instanceof Protocol.messages.DebugEvent, 'is debug event')
})
