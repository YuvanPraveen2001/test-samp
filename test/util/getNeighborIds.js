var test = require('tape')
var fs = require('fs')
var async = require('async')
var config = require('../config')
var cubelets = require('../../index')()
var Block = require('../../block')
var ClassicProtocol = require('../../protocol/classic')
var ImagoProtocol = require('../../protocol/imago')
var __ = require('underscore')

var client = cubelets.connect(config.device, function (err) {
  test('connected', function (t) {
    t.plan(1)
    if (err) {
      t.end(err)
    } else {
      t.pass('connected')

      test('set classic protocol', function (t) {
        t.plan(1)
        client.setProtocol(ClassicProtocol)
        t.pass('set protocol')
      })

      test.skip('set imago protocol', function (t) {
        t.plan(1)
        client.setProtocol(ImagoProtocol)
        t.pass('set protocol')
      })

      test('find host id', function (t) {
        t.plan(2)
        client.fetchOriginBlock(function (err, originBlock) {
          t.ifError(err, 'fetched origin')
          t.ok(originBlock)
          console.log('found', originBlock.getBlockId())
        })
      })

      test('find a neighbor and report its block id', function (t) {
        t.plan(2)
        client.fetchNeighborBlocks(function (err, neighborBlocks) {
          t.ifError(err, 'fetched neighbors')
          t.ok(neighborBlocks.length > 0, 'found at least one neighbor')
          __(neighborBlocks).each(function (block) {
            console.log('found', block.getBlockId(), 'on face', block.getFaceIndex())
          })
        })
      })

      test('disconnect', function (t) {
        t.plan(1)
        client.disconnect(t.ifError)
      })
    }
  })
})
