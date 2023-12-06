var test = require('tape')
var __ = require('underscore')
var cubelets = require('../index.js')('demo')

test('mutate', function (t) {
  t.plan(2)

  var client = cubelets.connect({
    name: 'Demo Cubelet',
    deviceId: 1337
  }, function (err) {
    client.getConnection().getDemo().mutate()
    t.pass('mutated')
    client.disconnect(function (err) {
      t.pass('disconnected')
    })
  })
})

test('ping pong', function (t) {
  t.plan(4)

  var GetAllBlocksRequest = cubelets.Protocol.messages.GetAllBlocksRequest
  var PingRequest = cubelets.Protocol.Block.messages.PingRequest

  var client = cubelets.connect({
    name: 'Demo Cubelet',
    deviceId: 1337
  }, function (err) {
    t.ifError(err, 'no connect err')
    client.sendRequest(new GetAllBlocksRequest(), function (err, res) {
      var block = __(res.blocks).first()
      t.ok(block, 'block exists')
      client.sendBlockRequest(new PingRequest(block.blockId), function (err, res) {
        t.ifError(err, 'no block request err')
        client.disconnect(function (err) {
          t.ifError(err, 'no disconnect err')
        })
      })
    })
  })
})

test('get block configuration', function (t) {
  t.plan(4)

  var GetAllBlocksRequest = cubelets.Protocol.messages.GetAllBlocksRequest
  var GetConfigurationRequest = cubelets.Protocol.Block.messages.GetConfigurationRequest

  var client = cubelets.connect({
    name: 'Demo Cubelet',
    deviceId: 1337
  }, function (err) {
    t.ifError(err, 'no connect err')
    client.sendRequest(new GetAllBlocksRequest(), function (err, res) {
      var block = __(res.blocks).first()
      t.ok(block, 'block exists')
      client.sendBlockRequest(new GetConfigurationRequest(block.blockId), function (err, res) {
        t.ifError(err, 'no block request err')
        client.disconnect(function (err) {
          t.ifError(err, 'no disconnect err')
        })
      })
    })
  })
})

test('visit block neighbors', function (t) {
  t.plan(6)

  var GetAllBlocksRequest = cubelets.Protocol.messages.GetAllBlocksRequest
  var GetNeighborsRequest = cubelets.Protocol.Block.messages.GetNeighborsRequest

  var client = cubelets.connect({
    name: 'Demo Cubelet',
    deviceId: 1337
  }, function (err) {
    t.ifError(err, 'no connect err')
    client.sendRequest(new GetAllBlocksRequest(), function (err, res) {
      var block = __(res.blocks).first()
      t.ok(block, 'block exists')
      client.sendBlockRequest(new GetNeighborsRequest(block.blockId), function (err, res) {
        t.ifError(err, 'no block request err')
        t.ok(res.neighbors, 'neighbors ok')
        t.notEqual(0, __(res.neighbors).values().length, 'not 0 neighbors')
        client.disconnect(function (err) {
          t.ifError(err, 'no disconnect err')
        })
      })
    })
  })
})

test.only('client graph', function (t) {
  t.plan(4)

  var client = cubelets.connect({
    name: 'Demo Cubelet',
    deviceId: 42
  }, function (err) {
    t.ifError(err, 'no connect err')
    client.fetchGraph(function (err, graph) {
      t.ifError(err, 'no graph err')
      t.ok(graph, 'graph ok')
      var graph = client.getGraph()
      client.disconnect(function (err) {
        t.ifError(err, 'no disconnect err')
      })
    })
  })
})

test('demo client', function (t) {
  t.plan(6)

  var GetConfigurationRequest = cubelets.Protocol.messages.GetConfigurationRequest

  var client = cubelets.connect({
    name: 'Demo Cubelet',
    deviceId: 1337
  }, function (err) {
    t.ifError(err, 'no connect err')
    t.pass('connect callback')
    client.sendRequest(new GetConfigurationRequest(), function (err, res) {
      t.ifError(err, 'no request err')
      t.ok(res, 'response ok')
      client.disconnect(function (err) {
        t.ifError(err, 'no disconnect err')
        t.pass('disconnected')
      })
    })
  })
})

test('get direct neighbors', function (t) {
  t.plan(6)

  var m = cubelets.Protocol.messages
  var GetAllBlocksRequest = m.GetAllBlocksRequest
  var GetNeighborBlocksRequest = m.GetNeighborBlocksRequest

  var client = cubelets.connect({
    name: 'Demo Cubelet',
    deviceId: 1337
  }, function (err) {
    t.ifError(err, 'no connect err')
    t.pass('connect callback')
    var demo = client.getConnection().getDemo()
    client.fetchConfiguration(function (err) {
      t.ok(client.getOriginBlock(), 'has origin block')
      client.sendRequest(new GetNeighborBlocksRequest(), function (err, res) {
        t.notEqual(__(res.neighbors).values().length, 0, 'has neighbors')
        client.disconnect(function (err) {
          t.ifError(err, 'no disconnect err')
          t.pass('disconnected')
        })
      })
    })
  })
})
