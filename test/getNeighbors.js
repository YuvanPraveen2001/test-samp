var test = require('tape')
var config = require('./config')
var cubelets = require('../index')()
var __ = require('underscore')

var client = cubelets.connect(config.device, function (err) {
  test('connected', function (t) {
    t.plan(1)
    if (err) {
      t.end(err)
    } else {
      t.pass('connected')

      test('find neighbors', function (t) {
        t.plan(3)
        client.fetchNeighborBlocks(function (err, neighborBlocks) {
          t.ifError(err, 'fetched neighbors')
          t.ok(neighborBlocks.length > 0, 'found at least one neighbor')
          __(neighborBlocks).each(function (block) {
            console.log('found', block.getBlockId())
          })
          t.pass('done')
        })
      })

      test('fetch block configs', function (t) {
        var neighborBlocks = client.getNeighborBlocks()
        client.fetchBlockConfigurations(neighborBlocks, function (err) {
          t.ifError(err, 'fetched block configs')
        })
      })

      test('disconnect', function (t) {
        t.plan(1)
        client.disconnect(t.ifError)
      })
    }
  })
})
