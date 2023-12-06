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

var bluetoothBlockId = config.map.type.bluetooth

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

      test('fetch host id', function(t){
      	t.plan(3)
      	// Determine Host ID
  			var req = new ClassicProtocol.messages.GetNeighborBlocksRequest()
  			client.sendRequest(req, function (err, res) {
  				t.ifError(err, 'fetch id err')
  				var originBlockId = res.originBlockId

  				t.ok(originBlockId != 0, 'bt id valid')
  				bluetoothBlockId = originBlockId
  				t.pass("found bt id")
  			})
      })

      test('flash bluetooth bootstrap firmware', function (t) {
        t.plan(2)
        var hex = fs.readFileSync('./upgrade/hex/bluetooth_bootstrap.hex')
        var program = new ClassicProgram(hex)
        t.ok(program.valid, 'firmware valid')
        var block = new Block(bluetoothBlockId, 0, BlockTypes.BLUETOOTH)
        block._mcuType = MCUTypes.AVR
        var flash = new ClassicFlash(client, {
          skipSafeCheck: true
        })
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
