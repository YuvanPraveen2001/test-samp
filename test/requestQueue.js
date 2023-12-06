var test = require('tape')
var util = require('util')
var events = require('events')
var Client = require('../client/net')
var Server = require('../server/net')
var RequestQueue = require('../protocol/requestQueue')

var port = 9876
var connection
var server = Server.createServer()
server.listen(port, function () {
  console.log('server listening on port', port)
})

var client = Client.connect({ port: port }, function (err) {
  if (err) {
    t.end(err)
  } else {
    var messages = client.getProtocol().messages
    var EchoRequest = messages.EchoRequest

    test('one request', function (t) {
      t.plan(3)

      var q = new RequestQueue(client)
      var req = new EchoRequest(new Buffer([ 0 ]))
      q.push(req, function (err, res) {
        t.ifError(err)
        t.ok(res)
        t.deepEqual(req.echo, res.echo)
      }, 1000)
    })

    test('fifo', function (t) {
      t.plan(8)
      var q = new RequestQueue(client)
      var req0 = new EchoRequest(new Buffer([ 0x01 ]))
      var req1 = new EchoRequest(new Buffer([ 0x02, 0x0A ]))
      var req2 = new EchoRequest(new Buffer([ 0x03, 0x0B, 0x0C ]))
      var req3 = new EchoRequest(new Buffer([ 0x04, 0x0F, 0xFF, 0x00 ]))

      q.push(req0, function (err, res) {
        t.ifError(err)
        t.deepEqual(req0.echo, res.echo)
      })
      q.push(req1, function (err, res) {
        t.ifError(err)
        t.deepEqual(req1.echo, res.echo)
      })
      q.push(req2, function (err, res) {
        t.ifError(err)
        t.deepEqual(req2.echo, res.echo)
      })
      q.push(req3, function (err, res) {
        t.ifError(err)
        t.deepEqual(req3.echo, res.echo)
      })
    })

    test('disconnect', function (t) {
      t.plan(1)
      server.unref()
      client.disconnect(t.ifError)
    })
  }
})
