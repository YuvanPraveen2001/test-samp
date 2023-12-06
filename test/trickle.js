var test = require('tape')
var device = require('./config').device
var cubelets = require('../index')()

test('trickle', function (t) {
  t.plan(10)

  var EchoRequest = cubelets.Protocol.messages.EchoRequest

  var echo0 = new Buffer([ 0x18 ])
  var echo1 = new Buffer([ 0xA1, 0xA2, 0xA3 ])
  var echo2 = new Buffer([ 0xCA, 0xCB, 0xCC ])

  var client = cubelets.connect(device, function (err) {
    t.ifError(err, 'no connect err')
    t.pass('connect callback')

    client.sendRequest(new EchoRequest(echo0), function (err, response) {
      t.ifError(err, 'echo0 ok')
      t.deepEqual(response.echo, echo0)
      client.sendRequest(new EchoRequest(echo1), function (err, response) {
        t.ifError(err, 'echo1 ok')
        t.deepEqual(response.echo, echo1)
        client.sendRequest(new EchoRequest(echo2), function (err, response) {
          t.ifError(err, 'echo2 ok')
          t.deepEqual(response.echo, echo2)
          client.disconnect(function (err) {
            t.ifError(err, 'no disconnect err')
            t.pass('disconnected')
          })
        })
      })
    })
  })
})
