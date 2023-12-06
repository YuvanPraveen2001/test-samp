var test = require('tape')
var util = require('util')
var events = require('events')
var Client = require('../client/net')
var Demo = require('../demo')
var DemoServer = require('../server/net')(Demo)
var CommandQueue = require('../commandQueue')

var port = 9877
var connection

var server = DemoServer.createServer(function (newConnection) {
  connection = newConnection
})

server.listen(port, function () {
  console.log('server listening on port', port)
})

var client = Client.connect({ port: port }, function (err) {
  if (err) {
    t.end(err)
  } else {
    var messages = client.getProtocol().messages
    var SetBlockValueCommand = messages.SetBlockValueCommand

    test('replace', function (t) {
      t.plan(1)

      var commandRate = 1000
      var q = new CommandQueue(client, commandRate)

      var command0 = new SetBlockValueCommand([{ blockId: 0xAABBCC, value: 22 }])
      var command1 = new SetBlockValueCommand([{ blockId: 0xAABBCC, value: 42 }])

      // Send two messages before command rate.
      setTimeout(function () {
        q.push(command0)
        q.push(command1)
      }, 100)

      var lastCommand
      client.on('command', function (command) {
        lastCommand = command
      })

      // Check to make sure the second one was sent after rate.
      setTimeout(function () {
        t.equal(command1.blocks[0].value, lastCommand.blocks[0].value)
      }, 200 + commandRate)
    })

    test('disconnect', function (t) {
      t.plan(1)
      server.unref()
      server.removeAllListeners()
      client.disconnect(t.ifError)
    })
  }
})
