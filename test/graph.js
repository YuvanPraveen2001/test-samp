var test = require('tape')
var async = require('async')
var config = require('./config')
var cubelets = require('../index')()
var Protocol = cubelets.Protocol

var client = cubelets.connect(config.device, function (err) {
  test('connected', function (t) {
    t.plan(1)
    if (err) {
      t.end(err)
    } else {
      t.pass('connected')

      test.skip('get configuration', function (t) {
        t.plan(2)
        client.fetchConfiguration(function (err, res) {
          t.ifError(err, 'no err')
          t.ok(res, 'response ok')
        })
      })

      test.skip('get neighbors', function (t) {
        t.plan(2)
        client.fetchNeighborBlocks(function (err, res) {
          t.ifError(err, 'no err')
          t.ok(res, 'response ok')
        })
      })

      test.skip('get block neighbors', function (t) {
        t.plan(2)
        var blockId = config.map.type.drive
        var GetNeighborsRequest = Protocol.Block.messages.GetNeighborsRequest
        client.sendBlockRequest(new GetNeighborsRequest(blockId), function (err, res) {
          t.ifError(err, 'no get neighbors err')
          t.ok(res, 'response ok')
        })
      })

      test.skip('graph', function (t) {
        t.plan(2)
        client.fetchGraph(function (err) {
          t.ifError(err, 'no fetch graph err')
          var graph = client.getGraph()
          t.ok(graph, 'graph ok')
        })
      })

      test('graph many times', function (t) {
        var n = 1000
        t.plan(n)
        var tasks = []
        for (var i = 0; i < n; ++i) {
          tasks.push(function (callback) {
            client.fetchGraph(function (err) {
              t.ifError(err, 'no graph error')
              callback(err)
            })
          })
        }
        async.series(tasks, function (err) {
          t.end(err)
        })
      })

      test('disconnect', function (t) {
        t.plan(1)
        client.disconnect(t.ifError)
      })
    }
  })
})
