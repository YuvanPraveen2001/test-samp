var args = process.argv
if (args.length < 3) {
  console.log('Usage: node bin/flashLatestApplication PATH')
  process.exit(1)
}

var cubelets = require('../index')()
var ImagoFirmwareService = require('../services/imagoFirmware')
var Protocol = cubelets.Protocol
var ImagoProgram = Protocol.Program
var ImagoFlash = Protocol.Flash
var Block = require('../block')
var __ = require('underscore')
var ImagoProtocol = require('../protocol/imago')
var fs = require('fs')
var MCUTypes = require('../mcuTypes')
var async = require('async')

var firmwareService = new ImagoFirmwareService()
var device = {
	path : args[2]
}
var client = cubelets.connect(device, function (err) {
  if (err) {
    console.error(err)
    process.exit()
  } else {
    console.log('Connected.')
    try {
      client.setMaxListeners(0)
    } catch (err) {}

    start(client)
  }
})

function start(client)
{
	var tasks = [
		fetchTargetBlock,
		fetchLatestFirmware,
		flashApplication,
		done
	]

	async.waterfall(tasks, function(err, result) {
		if(err)
		{
			console.log("Flashing failed.")
			process.exit()
		}
		else
		{
			console.log("Successfully flashed the latest application")
			process.exit()
		}
	})
}

function fetchTargetBlock(callback)
{//Figure out what block we are going to flash

	//Fetch all of the blocks in the construction
  client.sendRequest(new Protocol.messages.GetAllBlocksRequest(), function (err, response) {
    if (err) {
      console.error(err)
      process.exit()
    }
    else if(response.blocks.length < 1)
    {
    	console.log("Couldn't find a target block. Please make sure a block is connected and try again.")
    	process.exit()
    }

    //For simplicity, store the first block
    var targetBlockInfo = response.blocks[0]

    //Create an actual Block object
    var targetBlock = new Block(targetBlockInfo.blockId, targetBlockInfo.hopCount, Block.blockTypeForId(targetBlockInfo.blockTypeId), MCUTypes.PIC)

    //Fetch the blocks configuration to know it's block type incase it's in bootloader mode
    var request = new ImagoProtocol.Block.messages.GetConfigurationRequest(targetBlock.getBlockId())
    client.sendBlockRequest(request, function (err, response) {
      if (err) {
        console.log(err)
        process.exit()
      }

      //Store the block type and versions that came back from the Get Configuration request
      targetBlock._blockType = Block.blockTypeForId(response.blockTypeId)
			targetBlock._applicationVersion = response.applicationVersion
			targetBlock._bootloaderVersion = response.bootloaderVersion
			targetBlock._hardwareVersion = response.hardwareVersion


      //TODO: Hack to store the correct MCU type.
      targetBlock._mcuType = MCUTypes.PIC

      callback(null, targetBlock);
    })
  })
}

function fetchLatestFirmware(block, callback)
{
	firmwareService.fetchLatestHex(block, function(err, response) {
		if(err)
		{
			console.log(err)
			process.exit()
		}

		var application = new ImagoProgram(response.hexBlob)
    if (!application.valid) {
	    console.log("An invalid hex file was received from the firmware service.")
	    process.exit();
    }
    callback(null, block, application)
	})
}

function flashApplication(block, application, callback)
{
	var flash = new ImagoFlash(client)
  flash.on('progress', function(e) {
  	var progress = ((e.progress / e.total) * 100).toFixed(2)
    console.log("Uploading..." + progress + "%")
  })
  var totalSize = application.data.length
  var listener = function(e) {
    if ( e instanceof Protocol.messages.FlashProgressEvent) {
    	var progress = ((e.progress / totalSize) * 100).toFixed(2)
    	console.log("Flashing..." + progress + "%")
    }
  }
  client.on('event', listener);
  flash.programToBlock(application, block, function(err) {
	  if (err) {
	    callback("Flashing failed")
	  } else {
	    callback(null)
	  }
  })
}

function done(callback) {
	callback(null, 'done')
}
