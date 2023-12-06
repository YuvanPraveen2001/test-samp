var test = require('tape')
var Demo = require('../demo')
var NetClient = require('../client/net')
var NetServer = require('../server/net')(Demo)
var cubelets = NetClient

var port = 9000
var connection

var server = NetServer.createServer(function (newConnection) {
  connection = newConnection
})

server.listen(port, function () {
  console.log('server listening on port', port)
})

function getDemo() {
  return connection
}

test('net client', function (t) {
  t.plan(6)

  var GetConfigurationRequest = cubelets.Protocol.messages.GetConfigurationRequest

  var client = cubelets.connect({
    port: port
  }, function (err) {
    t.ifError(err, 'no connect err')
    t.pass('connect callback')
    client.sendRequest(new GetConfigurationRequest(), function (err, response) {
      t.ifError(err, 'no request err')
      t.ok(response, 'response ok')
      client.disconnect(function (err) {
        t.ifError(err, 'no disconnect err')
        t.pass('disconnected')
      })
    })
  })
})

test('get neighbor blocks', function (t) {
  t.plan(6)

  var m = cubelets.Protocol.messages
  var GetAllBlocksRequest = m.GetAllBlocksRequest
  var GetNeighborBlocksRequest = m.GetNeighborBlocksRequest

  var client = cubelets.connect({
    port: port
  }, function (err) {
    t.ifError(err, 'no connect err')
    t.pass('connect callback')
    var demo = getDemo()
    client.fetchConfiguration(function (err) {
      t.ok(client.getOriginBlock(), 'has origin block')
      demo.addBlock({ blockId: 1, faceIndex: 1, hopCount: 1 })
      demo.addBlock({ blockId: 2, faceIndex: 2, hopCount: 1 })
      client.sendRequest(new GetNeighborBlocksRequest(), function (err, response) {
        t.notEqual(response.blocks.length, 0, 'has blocks')
        client.disconnect(function (err) {
          t.ifError(err, 'no disconnect err')
          t.pass('disconnected')
        })
      })
    })
  })
})

test('close', function (t) {
  t.plan(1)
  server.close()
  t.pass('server closed')
})
