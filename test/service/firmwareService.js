var test = require('tape')
var fs = require('fs')
var FirmwareService = require('../../services/firmware')
var InfoService = require('../../services/info')
var Upgrade = require('../../upgrade')
var Block = require('../../block')
var BlockTypes = require('../../blockTypes')
var MCUTypes = require('../../mcuTypes')
var Version = require('../../version')

var firmwareService = new FirmwareService()

testDownloadLatestFirmware(166417)

test.skip('download bluetooth firmware', function (t) {
  t.plan(3)
  var version = new Version(3, 3)
  var block = new Block(167058, 0, BlockTypes.BLUETOOTH)
  block._mcuType = MCUTypes.AVR
  firmwareService.downloadVersion(block, version, function (err, hex) {
    t.ifError(err)
    t.ok(hex)
    fs.writeFile('./.tmp/hex/' + version.toString() + '/bluetooth.hex', hex, t.ifError)
  })
})

function testDownloadFirmware(BlockType, version) {
  test('download ' + BlockType.name + ' firmware', function (t) {
    t.plan(3)
    var block = new Block(1337, 99, BlockType)
    block._mcuType = MCUTypes.PIC
    firmwareService.downloadVersion(block, version, function (err, hex) {
      t.ifError(err)
      t.ok(hex)
      fs.writeFile('./.tmp/hex/' + version.toString() + '/' + BlockType.name + '.hex', hex, t.ifError)
    })
  })
}

// testDownloadFirmware(BlockTypes.DRIVE, new Version(2, 0))
// testDownloadFirmware(BlockTypes.DISTANCE, new Version(2, 0))
// testDownloadFirmware(BlockTypes.BATTERY, new Version(2, 0))

function testDownloadLatestFirmware(blockId) {
  test('fetch info for block ' + blockId, function (t) {
    t.plan(3)
    var block = new Block(blockId, 0, BlockTypes.UNKNOWN)
    var infoService = new InfoService()
    infoService.fetchBlockInfo([block], function (err, infos) {
      t.ifError(err)
      t.equal(infos.length, 1)
      var info = infos[0]
      var version = info.latestFirmwareVersion
      var blockType = Block.blockTypeForId(info.blockTypeId)
      t.ok(blockType !== BlockTypes.UNKNOWN)
      test('download ' + blockType.name + ' firmware', function (t) {
        t.plan(3)
        block._mcuType = Block.mcuTypeForId(info.mcuTypeId)
        block._blockType = blockType
        firmwareService.downloadVersion(block, version, function (err, hex) {
          t.ifError(err)
          t.ok(hex)
          fs.writeFile('./.tmp/hex/latest/' + block.getBlockType().name + '.hex', hex, t.ifError)
        })
      })
    })
  })
}

testDownloadLatestFirmware(167058)
