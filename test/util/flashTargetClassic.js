var test = require('tape')
var fs = require('fs')
var config = require('../config')
var cubelets = require('../../index')()
var Block = require('../../block')
var BlockTypes = require('../../blockTypes')
var MCUTypes = require('../../mcuTypes')
var ClassicProtocol = require('../../protocol/classic')
var ClassicFlash = ClassicProtocol.Flash
var ClassicProgram = ClassicProtocol.Program
var InfoService = require('../../services/info')
var FirmwareService = require('../../services/firmware')
var __ = require('underscore')

var targetBlockId = 167014

var client = cubelets.connect(config.device, function (err) {
  test('connected', function (t) {
    t.plan(1)
    if (err) {
      t.end(err)
    } else {
      t.pass('connected')

      var targetBlock = new Block(targetBlockId, 1)

      test('set classic protocol', function (t) {
        t.plan(1)
        client.setProtocol(ClassicProtocol)
        t.pass('set protocol')
      })

      var targetHex

      test.skip('force block type', function (t) {
        t.plan(1)
        var hex = './downgrade/hex/battery.hex'
        targetHex = fs.readFileSync(hex)
        t.pass('using hex: ' + hex)
      })

      test('fetch info for block', function (t) {
        t.plan(6)

        var infoService = new InfoService()
        infoService.fetchBlockInfo([targetBlock], function (err, infos) {
          t.ifError(err)
          t.equal(infos.length, 1)
          var info = infos[0]
          var version = info.latestFirmwareVersion
          var blockType = Block.blockTypeForId(info.blockTypeId)
          t.ok(blockType !== BlockTypes.UNKNOWN)
          targetBlock._blockType = blockType
          t.ok(blockType !== MCUTypes.UNKNOWN)
          targetBlock._mcuType = Block.mcuTypeForId(info.mcuTypeId)

          var firmwareService = new FirmwareService()
          firmwareService.downloadVersion(targetBlock, version, function (err, hex) {
            t.ifError(err)
            targetHex = hex
            t.ok(hex)
          })
        })
      })

      test('flash classic firmware to target block', function (t) {
        t.plan(2)
        var program = new ClassicProgram(targetHex)
        t.ok(program.valid, 'firmware valid')
        var flash = new ClassicFlash(client, {
          skipSafeCheck: true
        })
        flash.programToBlock(program, targetBlock, function (err) {
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
