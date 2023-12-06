var test = require('tape')
var fs = require('fs')
var async = require('async')
var config = require('../config')
var cubelets = require('../../index')()
var Block = require('../../block')
var ImagoProtocol = require('../../protocol/imago')
var __ = require('underscore')

var client = cubelets.connect(config.device, function (err) {
  test('connected', function (t) {
    t.plan(1)
    if (err) {
      t.end(err)
    } else {
      t.pass('connected')

      var mode = 0
      testNeighborsSetModeFromImago(mode)

      function testNeighborsSetModeFromImago(mode) {
        test(('put neighbors into ' + (mode ? 'application' : 'bootloader') + ' from imago'), function (t) {
          t.plan(2)
          client.sendRequest(new ImagoProtocol.messages.GetNeighborBlocksRequest(), function (err, response) {
            t.ifError(err)
            var blockIds = __(response.neighbors).values()
            var tasks = __(blockIds).map(function (blockId) {
              return function (callback) {
                var request = new ImagoProtocol.Block.messages.SetModeRequest(blockId, mode)
                client.sendBlockRequest(request, function (err, response) {
                  if (err) {
                    callback(err)
                  } else if (response.mode !== mode) {
                    callback(new Error('Failed to jump to mode.'))
                  } else {
                    callback(null)
                  }
                })
              }
            })
            async.series(tasks, function (err) {
              t.ifError(err, 'all blocks jumped')
            })
          })
        })
      }

      test('disconnect', function (t) {
        t.plan(1)
        client.disconnect(t.ifError)
      })
    }
  })
})
