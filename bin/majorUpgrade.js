var args = process.argv
if (args.length < 3) {
  console.log('Usage: node bin/majorUpgrade PORT or COLOR_PATTERN ie: node bin/majorupgrade.js YBY')
  process.exit(1)
}

var defaultColor
if (args.length === 3) {
	// Default color of the terminal window
	defaultColor = '\x1b[37;40m'
} else {
	defaultColor = args[3]
}

var __ = require('underscore')
var async = require('async')
var cubelets = require('../index')()
var Protocol = cubelets.Protocol
var Block = require('../block')
var BlockTypes = require('../blockTypes')
var __ = require('underscore')
var ImagoProtocol = require('../protocol/imago')
var ClassicProtocol = require('../protocol/classic')
var ClassicFlash = ClassicProtocol.Flash
var ClassicProgram = ClassicProtocol.Program
var BootstrapProtocol = require('../protocol/bootstrap')
var UpgradeBootloader = require('../upgrade/upgradeBootloader')
var fs = require('fs')
var MCUTypes = require('../mcuTypes')
var clc = require('cli-color')

var FirmwareType = {
  CLASSIC: 0,
  IMAGO: 1,
  BOOTSTRAP: 2
}

// Console output colors
var error = clc.bgRed.white.bold
var success = clc.bgGreen.white.bold

var port = null;

//Connection object
var client = null;

var upgradeBootloader = null
var finalCallback = null

var uploadDone = false

//Check if a COM port was supplied
if( args[2].indexOf('COM') > -1 )
{
  port = args[2]
  connect(port)
}
else if(args[2].length == 3 && args[2].match(/[R,G,B,M,C,W,Y][R,G,B,M,C,W,Y][R,G,B,M,C,W,Y]/i))
{//An LED pattern was passed in.
  findComPortFromIdentPattern(args[2], function(comPort){
    port = comPort
    connect(port)
  })
}
else {
  console.error("Error: parameter must be either a COM port or 3 character LED ident pattern (RGB)")
  process.exit(1)
}

//Initiate the connection, then start the loop
function connect(port){
  console.log("Attempting to connect on port: "+port)
  var device = {
    path: port
  }
  client = cubelets.connect(device, function (err) {
    upgradeBootloader = new UpgradeBootloader(client)
    attachListeners(client)
    if (err) {
      console.error(err)
      process.exit()
    } else {
      console.log('Connected.')
      try {
        client.setMaxListeners(0)
      } catch (err) {}
      start(client, true)
    }
  })
}

function start(client, firstRun){

  //TODO: Make sure BT is running the correct firmware

  var tasks = [
    fetchTargetBlock,//Find the block we want to upgrade
    fetchBlockConfiguration,//Fetch its configuration
    startUpgrade,//Kick off upgrade
    waitForBlockRemoved,
    waitForBlockAdded
  ]
  if(firstRun)
  {
    tasks.unshift(waitForBlockAdded)
    tasks.unshift(resetBT)
    tasks.unshift(flashBTIfNeeded)
    tasks.unshift(checkBluetoothOperatingMode)
  }

  async.waterfall(tasks, function(err, result) {
    if (err) {
      console.error(err)
      exit(1)
    }
    start(client, false)
    return
  })
}

function checkBluetoothOperatingMode (callback) {
  // Switch to the classic protocol
  client.setProtocol(ClassicProtocol)
  client.sendRequest(new ClassicProtocol.messages.KeepAliveRequest(), function (err, response) {
    if (err) {
      console.log('Bluetooth block is running OS4 application.')
      callback(null, FirmwareType.IMAGO)
    } else if (response.payload.length > 0) {
      console.log('Bluetooth block is running OS4 bootstrap application.')
      // The bootstrap protocol will differentiate itself by
      // sending an extra byte in the response.
      callback(null, FirmwareType.BOOTSTRAP)
    } else {
      console.log('Bluetooth block is running OS3 application/bootloader.')
      callback(null, FirmwareType.CLASSIC)
    }
  })
}

function flashBTIfNeeded(fromMode, callback)
{
  if (fromMode === FirmwareType.BOOTSTRAP)
  {//Flash host with imago from bootstrap
    client.setProtocol(BootstrapProtocol)
    var req = new BootstrapProtocol.messages.SetBootstrapModeRequest(1)
    client.sendRequest(req, function (err, res) {
      client.setProtocol(ImagoProtocol)
      var req = new ImagoProtocol.messages.SetModeRequest(0)
      client.sendRequest(req, function (err, res) {
        client.setProtocol(ClassicProtocol)
        var hex = fs.readFileSync('./upgrade/hex/bluetooth_application.hex')
        var program = new ClassicProgram(hex)
        var block = new Block(1, 0, BlockTypes.BLUETOOTH)
        block._mcuType = MCUTypes.AVR
        var flash = new ClassicFlash(client, {
          skipSafeCheck: true,
          skipReadyCommand: true
        })
        flash.programToBlock(program, block, function (err) {
          client.setProtocol(ImagoProtocol)
          callback(null);
        })
        flash.on('progress', function (e) {
          console.log('progress', '(' + e.progress + '/' + e.total + ')')
        })
      })
    })
  }
  else if(fromMode === FirmwareType.CLASSIC)
  {
    client.setProtocol(ClassicProtocol)
    var hex = fs.readFileSync('./upgrade/hex/bluetooth_application.hex')
    var program = new ClassicProgram(hex)
    var block = new Block(1, 0, BlockTypes.BLUETOOTH)
    block._mcuType = MCUTypes.AVR
    var flash = new ClassicFlash(client, {
      skipSafeCheck: true,
      skipReadyCommand: true
    })
    flash.programToBlock(program, block, function (err) {
      client.setProtocol(ImagoProtocol)
      callback(null);
    })
    flash.on('progress', function (e) {
      console.log('progress', '(' + e.progress + '/' + e.total + ')')
    })
  }
  else
  {//We are already running in imago, set the protocal and carry on.
    client.setProtocol(ImagoProtocol)
    callback(null);
  }
}

function resetBT(callback) {
	client.sendCommand(new ImagoProtocol.messages.ResetCommand())
	callback(null)
}

function startUpgrade(block, callback)
{
  // Get the pic bootloader+verification and application to flash
  var bootstrapHex = fs.readFileSync('./crc_upgrade/hex/boot_id_fix/' + block.getBlockType().name + '_bootstrap.hex')
  var applicationHex = fs.readFileSync('./upgrade/hex/application/' + block.getBlockType().name + '.hex')
  var deepMemoryBootloaderHex = fs.readFileSync('./crc_upgrade/hex/crc_update_bootloader/crc_update_bootloader.hex')

  // Kick-off the 3-stage flashing process
  upgradeBootloader.start(block, bootstrapHex, applicationHex, deepMemoryBootloaderHex)
  finalCallback = callback
}

function waitForBlockRemoved(callback) {
  console.log("Waiting for block to be removed...")
	client.once('event', function(message) {
		if ( message instanceof Protocol.messages.BlockRemovedEvent) {
			callback(null)
			return
		}
	})
}
function waitForBlockAdded(callback)
{
  console.log("Waiting for a block to update...")
	client.once('event', function(message) {
		if ( message instanceof Protocol.messages.BlockAddedEvent) {
			callback(null);
			return
		}
	})
}

function fetchTargetBlock(callback){
  client.sendRequest(new Protocol.messages.GetAllBlocksRequest(), function (err, response) {
    if (err) {
      callback(err)
      return
    }
    var blocks = []
    __.each(response.blocks, function (block) {
      blocks.push(new Block(block.blockId, block.hopCount, Block.blockTypeForId(block.blockTypeId)))
    })

    if (blocks.length > 1) {
      console.log('For testing purposes, please only attach a single block to be updated.')
      exit(1)
    } else if (blocks.length === 0) {
      console.log('Please attach a block that you want to upgrade the bootloader and application.')
      exit(1)
    }

    var targetBlock = blocks[0]
    callback(null, targetBlock)
  })
}

function fetchBlockConfiguration(block, callback)
{
  // Get config incase the block is in bootloader mode. Block type won't be known until then
  var request = new ImagoProtocol.Block.messages.GetConfigurationRequest(block.getBlockId())
  client.sendBlockRequest(request, function (err, response) {
    if (err) {
      callback(err)
      return
    }
    if(Block.blockTypeForId(response.blockTypeId).name != "unknown")
    {
      block._blockType = Block.blockTypeForId(response.blockTypeId)
    }

    block._mcuType = MCUTypes.PIC
    block.mode = response.mode
    callback(null, block)
  })
}

function attachListeners(client){
  client.on('disconnect', onDisconnect)
  upgradeBootloader.on('upgradeBootloader', onUpgradeBootloader)
  upgradeBootloader.on('flashDeepMemoryBootloader', onFlashDeepMemoryBootloader)
  upgradeBootloader.on('flashBootloader', onFlashBootloader)
  upgradeBootloader.on('flashApplication', onFlashApplication)
}

/*
 * Status updates for the entire process
 * Includes:
 * 					- {'status' : 'start'}
 * 					- {'status' : 'succcess'}
 * 					- {'status' : 'error',
								'error' : err
							}
 */
function onUpgradeBootloader(data)
{
  // console.log(data)
  switch (data.status) {
    case 'start':
      break
    case 'success':
      printSuccessMessage("Successfully upgraded bootloader and application")
      finalCallback(null)
      break
    case 'error':
      finalCallback(data.error)
      break
  }
}

/*
 * Status updates while flashing the deep memory bootloader
 * Includes:
 * 					- {	'status' : 'start'}
 * 					- {	'status' : 'uploadProgress'
 * 							'progress' : value
 * 						}
 *  				- {	'status' : 'flashProgress'
 * 							'progress' : value
 * 						}
 * 					- {	'status' : 'success'}
 */
function onFlashDeepMemoryBootloader(data)
{
  // console.log(data)
  switch (data.status) {
    case 'start':
      console.log('Flashing Deep Memory Bootloader')
      uploadDone = false
      break
    case 'flashProgress':
      uploadDone = true
      //flashBar.update(data.progress)
      printFlashProgress(data.progress)
      break
    case 'uploadProgress':
      if (!uploadDone) {
        if(data.progress == 1)
        {
          uploadDone = true
        }
        //uploadBar.update(data.progress)
        printUploadProgress(data.progress)
      }
      break
    case 'success':
      console.log('Done.\n')
      break
  }
}

/*
 * Status updates while flashing pic bootstrap
 *
 * Includes:
 * 					- {	'status' : 'start'}
 * 					- {	'status' : 'uploadProgress'
 * 							'progress' : value
 * 						}
 *  				- {	'status' : 'flashProgress'
 * 							'progress' : value
 * 						}
 * 					- {	'status' : 'success'}
 */
function onFlashBootloader(data)
{
  // console.log(data)
  switch (data.status) {
    case 'start':
      console.log('Flashing Bootloader.')
      uploadDone = false
      break
    case 'flashProgress':
      uploadDone = true
      //flashBar.update(data.progress)
      printFlashProgress(data.progress)
      break
    case 'uploadProgress':
      if (!uploadDone) {
        if(data.progress == 1)
        {
          uploadDone = true
        }
        //uploadBar.update(data.progress)
        printUploadProgress(data.progress)
      }
      break
    case 'success':
      console.log('Done\n')
      break
  }
}

/*
 * Status updates while flashing application
 *
 * Includes:
 * 					- {	'status' : 'start'}
 * 					- {	'status' : 'uploadProgress'
 * 							'progress' : value
 * 						}
 *  				- {	'status' : 'flashProgress'
 * 							'progress' : value
 * 						}
 * 					- {	'status' : 'success'}
 */
function onFlashApplication(data){
  // console.log(data)
  switch (data.status) {
    case 'start':
      console.log('Flashing Application')
      uploadDone = false
      break
    case 'flashProgress':
      uploadDone = true
      //flashBar.update(data.progress)
      printFlashProgress(data.progress)
      break
    case 'uploadProgress':
      if (!uploadDone) {
        if(data.progress == 1)
        {
          uploadDone = true
        }
        //uploadBar.update(data.progress)
        printUploadProgress(data.progress)
      }
      break
    case 'success':
      console.log('Done.\n')
      break
  }
}


function onDisconnect(){
  console.log('Disconnected.')
  exit(0)
}

//Unhandled Errors
process.on('uncaughtException', function (err) {
  console.error((new Date).toUTCString() + ' uncaughtException:', err.message)
  console.error(err.stack)
  exit(1)
})

function exit(code){
  if(upgradeBootloader)
  {
    upgradeBootloader.removeListener('upgradeBootloader', onUpgradeBootloader)
    upgradeBootloader.removeListener('flashDeepMemoryBootloader', onFlashDeepMemoryBootloader)
    upgradeBootloader.removeListener('flashBootloader', onFlashBootloader)
    upgradeBootloader.removeListener('flashApplication', onFlashApplication)
  }
  if(client){
    client.disconnect();
    client.removeAllListeners()
  }
  process.exit(code)
}

/**
Helper functions for finding com port
**/
function findComPortFromIdentPattern(pattern, callback)
{
  var BluetoothSerialPort = require('bluetooth-serial-port').BluetoothSerialPort
  var btSerialPort = new BluetoothSerialPort()

  btSerialPort.listPairedDevices(function(pairedDevices){
    __.each(pairedDevices, function(device){
      if(device.name.toLowerCase().indexOf(("cubelet-"+pattern).toLowerCase()) > -1){
        //We have found our device from BT serial port, time to find COM port
        findComPortByAddress(device.address, callback)
      }
    })
  })
}

function formatAddressForWindows(address){
  return address.replace(/:/g , "").toUpperCase();
}

function findComPortByAddress(address, callback){
  var sp = require('serialport')
  address = formatAddressForWindows(address)
  sp.list(function (err, ports) {
    __.each(ports, function(device){
      if(device.pnpId.indexOf(address) > -1){
        callback(device.comName)
      }
    })
  })
}

var flashProgressCount = 0;
function printFlashProgress(progress)
{
  if(progress == 0 || progress == 1)
  {
    flashProgressCount = 0
  }
  if(flashProgressCount == 0)
  {
    progress = Math.floor(progress*100)
    console.log("    Flashing..."+progress+"%")
  }
  flashProgressCount++
  if(flashProgressCount > 1)
  {
    flashProgressCount = 0;
  }
}

var uploadProgressCount = 0;
function printUploadProgress(progress)
{
  if(progress == 0 || progress == 1)
  {
    uploadProgressCount = 0
  }
  if(uploadProgressCount == 0)
  {
    progress = Math.floor(progress*100)
    console.log("    Uploading..."+progress+"%")
  }
  uploadProgressCount++
  if(uploadProgressCount > 14)
  {
    uploadProgressCount = 0;
  }
}

function printSuccessMessage(msg) {
	//80 blanks spaces to fill a complete line
	var fullLine = '                                                   \r\n'
	// process.stdout.write(success(fullLine))
	process.stdout.write(success(fullLine))
	process.stdout.write(success(msg + (fullLine.substring(0,fullLine.length - msg.length - 2))))
  process.stdout.write("\r\n")
	process.stdout.write(success(fullLine))
	process.stdout.write(defaultColor)
  console.log('')
  console.log('')
}
