var test = require('tape')
var fs = require('fs')
var config = require('./config')
var cubelets = require('../index')()
var Block = require('../block')
var BlockTypes = require('../blockTypes')
var MCUTypes = require('../mcuTypes')
var InfoService = require('../services/info')
var FirmwareService = require('../services/firmware')
var Upgrade = require('../upgrade')
var ClassicProtocol = require('../protocol/classic')
var Flash = ClassicProtocol.Flash
var Program = ClassicProtocol.Program
var __ = require('underscore')

var bluetoothBlockId = config.map.type.bluetooth

var client = cubelets.connect(config.device, function (err) {
  test('connected', function (t) {
    t.plan(1)
    if (err) {
      t.end(err)
    } else {
      t.pass('connected')

      test('must set protocol', function (t) {
        t.plan(1)
        client.setProtocol(ClassicProtocol)
        t.pass('set protocol')
      })

      test.skip('get neighbor blocks', function (t) {
        t.plan(5)
        client.fetchNeighborBlocks(function (err, neighborBlocks) {
          t.ifError(err, 'no error')
          t.ok(neighborBlocks.length > 0, 'should be at least 1 neighbor')
          t.ok(client.getNeighborBlocks().length > 0, 'get neighbor blocks')
          t.ok(client.getAllBlocks().length > 0, 'get all blocks')
          t.ok(client.getOriginBlock(), 'should also get origin block')
        })
      })

      test.skip('get all blocks', function (t) {
        t.plan(4)
        client.fetchAllBlocks(function (err, allBlocks) {
          t.ifError(err, 'no error')
          t.ok(allBlocks.length > 0, 'should be at least 1 block')
          t.ok(client.getAllBlocks().length > 0, 'get all blocks')
          t.ok(client.getOriginBlock(), 'should also get origin block')
        })
      })

      test('flash bluetooth firmware', function (t) {
        t.plan(2)
        var hex = fs.readFileSync('./downgrade/hex/bluetooth.hex')
        var program = new Program(hex)
        t.ok(program.valid, 'firmware valid')
        var flash = new Flash(client)
        var block = new Block(bluetoothBlockId, 0, BlockTypes.BLUETOOTH)
        block._mcuType = MCUTypes.AVR
        flash.programToBlock(program, block, function (err) {
          t.ifError(err, 'flash err')
        })
        flash.on('progress', function (e) {
          console.log('progress', '(' + e.progress + '/' + e.total + ')')
        })
      })

      test('disconnect', function (t) {
        t.plan(1)
        client.disconnect(t.ifError)
      })
    }
  })
})
