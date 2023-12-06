var test = require('tape')
var util = require('util')
var fs = require('fs')
var __ = require('underscore')

var config = require('./config')
var cubelets = require('../index')()
var Protocol = cubelets.Protocol
var Block = cubelets.Block
var BlockTypes = cubelets.BlockTypes
var Version = cubelets.Version
var Program = Protocol.Program

var blockIds = {
  bargraph: config.map.type.bargraph,
  drive: config.map.type.drive
}

var client = cubelets.connect(config.device, function (err) {
  test('connected', function (t) {
    t.plan(1)
    if (err) {
      t.end(err)
    } else {
      t.pass('connected')

      test('read memory table', function (t) {
        t.plan(3)
        client.sendRequest(new Protocol.messages.GetMemoryTableRequest(), function (err, response) {
          t.ifError(err, 'no response err')
          t.ok(response, 'response ok')
          t.ok(response.slots, 'slots ok')
          console.log(response.slots)
        })
      })

      // a line is 2 bytes for address + 16 bytes for data
      var lineLength = 18

      var lineData1 = new Buffer([
          0x00, 0x00, // address
          0xd3, 0x4d, 0x99, 0x3f, 0x00, 0xc0, 0xff, 0xee, // data
          0xd3, 0x4d, 0xb3, 0x3f, 0x00, 0xc0, 0xff, 0xee,
      ])

      var lineData2 = new Buffer([
          0x42, 0x22,
          0x00, 0x00, 0x00, 0x01, 0x00, 0xff, 0x00, 0xff,
          0x00, 0x00, 0x00, 0x01, 0x00, 0xff, 0x00, 0xff,
      ])

      var lineData3 = new Buffer([
          0x13, 0x37,
          0x13, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0x37,
          0x13, 0x33, 0x33, 0x33, 0x33, 0x33, 0x33, 0x37,
      ])

      var smallSlotData = Buffer.concat([
        lineData1,
        lineData2,
        lineData3
      ])

      test('write to slot 31 should fail', function (t) {
        t.plan(3)
        var slotIndex = 31
        var slotSize = smallSlotData.length / 18
        var blockTypeId = BlockTypes.PASSIVE.typeId
        var version = new Version(1, 2, 3)
        var isCustom = false
        var crc = 0xcc
        var request = new Protocol.messages.UploadToMemoryRequest(slotIndex, slotSize, blockTypeId, version, isCustom, crc)
        // send an upload request
        client.sendRequest(request, function (err, response) {
          t.ifError(err, 'no response err')
          t.ok(response, 'response ok')
          t.equal(response.result, 1, 'result fail')
        })
      })

      test('write to slot 30 should succeed', function (t) {
        t.plan(6)
        var slotIndex = 30
        var slotSize = smallSlotData.length / 18
        var blockTypeId = BlockTypes.PASSIVE.typeId
        var version = new Version(1, 2, 3)
        var isCustom = false
        var crc = 0xcc
        var request = new Protocol.messages.UploadToMemoryRequest(slotIndex, slotSize, blockTypeId, version, isCustom, crc)
        // send an upload request
        client.sendRequest(request, function (err, response) {
          t.ifError(err, 'no response err')
          t.ok(response, 'response ok')
          t.equal(response.result, 0, 'result success')
          // send the data
          client.sendData(smallSlotData, function (err) {
            t.ifError(err, 'no err')
          })
        })
        // wait for an upload complete event
        client.on('event', function listener (e) {
          if (e instanceof Protocol.messages.UploadToMemoryCompleteEvent) {
            client.removeListener('event', listener)
            t.ok(e, 'event ok')
            t.pass('sent data')
          }
        })
      })

      test('writing too much data should fail', function (t) {
        t.plan(3)
        var slotIndex = 30
        var slotSize = 911 // 16k =~ 910 lines
        var blockTypeId = BlockTypes.PASSIVE.typeId
        var version = new Version(1, 2, 3)
        var isCustom = false
        var crc = 0xcc
        var request = new Protocol.messages.UploadToMemoryRequest(slotIndex, slotSize, blockTypeId, version, isCustom, crc)
        // send an upload request
        client.sendRequest(request, function (err, response) {
          t.ifError(err, 'no response err')
          t.ok(response, 'response ok')
          t.equal(response.result, 1, 'result fail')
        })
      })

      test('write to memory slot', function (t) {
        t.plan(15)
        var slotIndex = 22
        var slotSize = Math.ceil(smallSlotData.length / lineLength)
        var blockTypeId = BlockTypes.PASSIVE.typeId
        var version = new Version(4, 5, 6)
        var isCustom = false
        var crc = 0xcc
        var request = new Protocol.messages.UploadToMemoryRequest(slotIndex, slotSize, blockTypeId, version, isCustom, crc)
        // send an upload request
        client.sendRequest(request, function (err, response) {
          t.ifError(err, 'no upload response err')
          t.ok(response, 'upload response ok')
          t.equal(response.result, 0, 'upload result success')
          // send the data
          client.sendData(smallSlotData, function (err) {
            t.ifError(err, 'no data err')
          })
        })
        // wait for an upload complete event
        client.on('event', function listener (e) {
          if (e instanceof Protocol.messages.UploadToMemoryCompleteEvent) {
            client.removeListener('event', listener)
            t.ok(e, 'event ok')
            t.equal(e.result, 0, 'event result success')
            testMemoryTable()
          }
        })
        // then test the table again once upload is complete
        function testMemoryTable() {
          client.sendRequest(new Protocol.messages.GetMemoryTableRequest(), function (err, response) {
            t.ifError(err, 'no response err')
            t.ok(response, 'response ok')
            var slots = response.slots
            t.ok(slots[slotIndex], 'slot exists')
            var slot = slots[slotIndex]
            t.equal(slot.slotSize, slotSize)
            t.equal(slot.blockTypeId, blockTypeId)
            t.equal(slot.version.major, version.major)
            t.equal(slot.version.minor, version.minor)
            t.equal(slot.version.patch, version.patch)
            t.equal(slot.isCustom, isCustom)
          })
        }
      })

      test('target bargraph block exists', function (t) {
        t.plan(3)
        client.sendRequest(new Protocol.messages.GetAllBlocksRequest(), function (err, response) {
          t.ifError(err, 'no blocks response err')
          t.ok(response, 'blocks response ok')
          var bargraph = __(response.blocks).find(function (block) {
            return block.blockId === blockIds.bargraph
          })
          t.ok(bargraph, 'has a bargraph')
        })
      })

      test('can flash a bargraph hex', function (t) {
        t.plan(9)

        // check the program is valid
        var blockId = blockIds.bargraph
        var hex = fs.readFileSync('./upgrade/hex/application/bargraph.hex')
        var program = new Program(hex)
        t.ok(program.valid, 'program valid')

        var slotIndex = 2
        var slotData = program.data
        var slotSize = Math.ceil(slotData.length / lineLength)
        var blockTypeId = BlockTypes.BARGRAPH.typeId
        var version = new Version(4, 5, 6)
        var isCustom = false
        var crc = 0xcc

        // send an upload request
        var request = new Protocol.messages.UploadToMemoryRequest(slotIndex, slotSize, blockTypeId, version, isCustom, crc)
        client.sendRequest(request, function (err, response) {
          t.ifError(err, 'no upload response err')
          t.ok(response, 'upload response ok')
          t.equal(response.result, 0, 'upload result success')
          // send the data
          client.sendData(program.data, function (err) {
            console.log('send data callback', err)
          })
        })
        // wait for an upload complete event
        client.on('event', function listener (e) {
          if (e instanceof Protocol.messages.UploadToMemoryCompleteEvent) {
            client.removeListener('event', listener)
            t.ok(e, 'event ok')
            t.equal(e.result, 0, 'event result success')
            testFlash()
          }
        })
        // then test flashing
        function testFlash() {
          var request = new Protocol.messages.FlashMemoryToBlockRequest(blockId, slotIndex)
          client.sendRequest(request, function (err, response) {
            t.ifError(err, 'no flash response err')
            t.ok(response, 'flash response ok')
            t.equal(response.result, 0, 'flash result success')
          }, 1000 * 10)
        }
      })

      test.skip('target drive block exists', function (t) {
        t.plan(3)
        client.sendRequest(new Protocol.messages.GetAllBlocksRequest(), function (err, response) {
          t.ifError(err, 'no blocks response err')
          t.ok(response, 'blocks response ok')
          var drive = __(response.blocks).find(function (block) {
            return block.blockId === driveBlockId
          })
          t.ok(drive, 'has a drive')
        })
      })

      test.skip('can flash a drive hex', function (t) {
        t.plan(9)

        // check the program is valid
        var blockId = driveBlockId
        var hex = fs.readFileSync(__dirname + '/hex/drive.hex')
        var program = new Program(hex)
        t.ok(program.valid, 'program valid')

        var slotIndex = 5
        var slotData = program.data
        var slotSize = Math.ceil(slotData.length / lineLength)
        var blockTypeId = BlockTypes.DRIVE.typeId
        var version = new Version(4, 5, 6)
        var isCustom = false
        var crc = 0xcc

        // send an upload request
        var request = new Protocol.messages.UploadToMemoryRequest(slotIndex, slotSize, blockTypeId, version, isCustom, crc)
        client.sendRequest(request, function (err, response) {
          t.ifError(err, 'no upload response err')
          t.ok(response, 'upload response ok')
          t.equal(response.result, 0, 'upload result success')
          // send the data
          client.sendData(program.data, function (err) {
            console.log('send data callback', err)
          })
        })
        // wait for an upload complete event
        client.on('event', function listener (e) {
          if (e instanceof Protocol.messages.UploadToMemoryCompleteEvent) {
            client.removeListener('event', listener)
            t.ok(e, 'event ok')
            t.equal(e.result, 0, 'event result success')
            testFlash()
          }
        })
        // then test flashing
        function testFlash() {
          var request = new Protocol.messages.FlashMemoryToBlockRequest(blockId, slotIndex)
          client.sendRequest(request, function (err, response) {
            t.ifError(err, 'no flash response err')
            t.ok(response, 'flash response ok')
            t.equal(response.result, 0, 'flash result success')
          }, 1000 * 10)
        }
      })

      // for debugging:
      // test('debug read table', debugExternalMemory()
      //   .readTable())
      // test('debug read slot', debugExternalMemory()
      //   .readSlot(2, 0x14000 / 32))

      test('disconnect', function (t) {
        t.plan(1)
        client.disconnect(t.ifError)
      })
    }
  })
})

function debugExternalMemory() {

  this.readTable = function () {
    return function (t) {
      t.plan(1)
      var stream = client.getConnection()
      var n = 0
      var totalSize = 0x14000
      stream.write(new Buffer([
        '<'.charCodeAt(0),
        0x12,
        0x00,
        '>'.charCodeAt(0)
      ]))
      var fs = require('fs')
      stream.on('data', function (data) {
        fs.appendFileSync('./debug-memory-table.log', data)
        n += data.length
        if (n >= totalSize) {
          t.pass('done')
        }
      })
    }
  }

  this.readSlot = function (slotIndex, slotSize) {
    return function (t) {
      t.plan(1)
      var stream = client.getConnection()
      var n = 0
      stream.write(new Buffer([
        '<'.charCodeAt(0),
        0x18,
        0x02,
        '>'.charCodeAt(0),
        slotIndex,
        slotSize ]))
      var fs = require('fs')
      stream.on('data', function (data) {
        fs.appendFileSync('./debug-memory-slot-' + slotIndex + '.log', data)
        n += data.length
        if (n >= slotSize) {
          t.pass('done')
        }
      })
    }
  }

  return this
}
