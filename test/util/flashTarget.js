var args = process.argv
if (args.length < 3) {
  console.log('Usage: node bin/flashTargetForever PATH')
  process.exit(1)
}

var cubelets = require('../../index')()
var ImagoFirmwareService = require('../../services/imagoFirmware')
var Protocol = cubelets.Protocol
var ImagoProgram = Protocol.Program
var ImagoFlash = Protocol.Flash
var Block = require('../../block')
var __ = require('underscore')
var ImagoProtocol = require('../../protocol/imago')
var fs = require('fs')
var MCUTypes = require('../../mcuTypes')
var async = require('async')
var Version = require('../../version')

//Change this to change the block you are flashing.
var TARGET_BLOCK_ID = 165955;

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
var count = 0;
function start(client)
{
	var tasks = [
		fetchTargetBlock,
		fetchLatestFirmware,
		flashApplication,
    resetBT,
    wait,
		done
	]

	async.waterfall(tasks, function(err, result) {
		count++;
		if(err)
		{
			console.log(err)
			console.log("Flashing failed on attempt: "+count)
			process.exit()
		}
		else
		{
			console.log("Flashing success: "+count)
			process.exit();
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

    var targetBlockInfo = null;
    //For simplicity, store the first block
    __.each(response.blocks, function(block)
    {
    	if(block.blockId === TARGET_BLOCK_ID)
    	{
    		targetBlockInfo = block;
    	}
    })

		if(targetBlockInfo === null)
		{
			callback(new Error("Failed to find target block"));
			return;
		}

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
		var applicationHex = fs.readFileSync('./upgrade/hex/application/' + block.getBlockType().name + '.hex')
		var application = new ImagoProgram(applicationHex)
    if (!application.valid) {
	    console.log("An invalid hex file was received from the firmware service.")
	    process.exit();
    }
    callback(null, block, application)
	})
}
var once = 0;
function flashApplication(block, application, callback)
{
	var flash = new ImagoFlash(client)
  flash.once('progress', function(e) {
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
	    var slot = {
      index: 0,
      blockTypeId: block.getBlockType().typeId,
      version: new Version(0, 0, 0),
      isCustom: false,
      crc: 0xcc
    }

  flash.programToBlock(application, block, function(err) {
  	client.removeListener('event', listener);
	  if (err) {
	    callback("Flashing failed")
	  } else {
	    callback(null)
	  }
  })
}
function resetBT (callback) {
  client.sendCommand(new ImagoProtocol.messages.ResetCommand())
  callback(null, 2000)
}
function wait (howLong, callback) {
  setTimeout(function () {
    callback(null)
  }, howLong)
}

function done(callback) {
	callback(null, 'done')
}
