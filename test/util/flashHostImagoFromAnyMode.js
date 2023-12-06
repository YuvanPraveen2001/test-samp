var test = require('tape')
var fs = require('fs')
var config = require('../config')
var cubelets = require('../../index')()
var Block = require('../../block')
var BlockTypes = require('../../blockTypes')
var MCUTypes = require('../../mcuTypes')
var BootstrapProtocol = require('../../protocol/bootstrap')
var Upgrade = require('../../upgrade')
var ClassicProtocol = require('../../protocol/classic')
var ImagoProtocol = require('../../protocol/imago')
var ClassicFlash = ClassicProtocol.Flash
var ClassicProgram = ClassicProtocol.Program

var bluetoothBlockId = config.map.type.bluetooth

var args = process.argv
var device;
console.log(args.length)
if (args.length >= 3) {
  device = {
    path: args[2]
  }
}
else {
  device = config.device
}

var client = cubelets.connect(device, function (err) {
  test('connected', function (t) {
    t.plan(1)
    if (err) {
      t.end(err)
    } else {
      t.pass('connected')

      var upgrade = new Upgrade(client)

      test('set host mode bootloader', function (t) {
        t.plan(3)
        upgrade.detectIfNeeded(function (err, needsUpgrade, firmwareType) {
          t.ifError(err, 'detect ok')
					switch(firmwareType)
					{
						case 0: //classic
							t.pass()
							t.pass()
							//TODO: Flashing will only work if the block is already in bootloader already?
						break;

						case 1://Imago
							t.pass('detect imago mode')
							client.setProtocol(ImagoProtocol)
							var req = new ImagoProtocol.messages.SetModeRequest(0)
			        client.sendRequest(req, function (err, res) {
			        }, 200)
			        setTimeout(function()
			        {
			        	t.pass("set host to bootloader mode from OS4")
			        }, 1000)

						break;
						case 2://Bootstrap
			        client.setProtocol(BootstrapProtocol)
			        var req = new BootstrapProtocol.messages.SetBootstrapModeRequest(1)
			        client.sendRequest(req, function (err, res) {
			          t.ifError(err)
			          client.setProtocol(ImagoProtocol)
			          var req = new ImagoProtocol.messages.SetModeRequest(0)
			          client.sendRequest(req, function (err, res) {
			            t.pass()
			          })
			        })
						break;
					}
        })
      })

      test('set classic protocol', function (t) {
        t.plan(1)
        client.setProtocol(ClassicProtocol)
        t.pass('set protocol')
      })

      test('flash bluetooth imago firmware', function (t) {
        t.plan(2)
        var hex = fs.readFileSync('./upgrade/hex/bluetooth_application.hex')
        var program = new ClassicProgram(hex)
        t.ok(program.valid, 'firmware valid')
        var block = new Block(bluetoothBlockId, 0, BlockTypes.BLUETOOTH)
        block._mcuType = MCUTypes.AVR
        var flash = new ClassicFlash(client, {
          skipSafeCheck: true,
          skipReadyCommand: true
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
