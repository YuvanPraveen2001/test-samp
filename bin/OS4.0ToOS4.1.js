var args = process.argv
if (args.length < 3) {
	console.log('Usage: node bin/OS4.0ToOS4.1 PATH {{DEFAULT_COLOR}} {{USE_PROGRESS_BAR}}')
	process.exit(1)
}

var fs = require('fs')
var async = require('async')
var clc = require('cli-color')
var ProgressBar = require('progress');

var bar = new ProgressBar('uploading [:bar] :percent', {
	width : 40,
	total : 100
});

var __ = require('underscore')
var cubelets = require('../index')()
var Protocol = cubelets.Protocol
var Block = require('../block')
var BlockTypes = require('../blockTypes')
var MCUTypes = require('../mcuTypes')
var InfoService = require('../services/info')
var ImagoProtocol = require('../protocol/imago')
var ImagoProgram = ImagoProtocol.Program
var ImagoFlash = ImagoProtocol.Flash
var ClassicProtocol = require('../protocol/classic')
var ClassicProgram = ClassicProtocol.Program
var ClassicFlash = ClassicProtocol.Flash
var BootstrapProtocol = require('../protocol/bootstrap')
var FirmwareService = require('../services/firmware')
var Version = require('../version')
var Os3LatestVersions = require('../downgrade/config.json')['latestOS3Versions']
var IdService = require('../services/id')

var FirmwareType = {
	CLASSIC : 0,
	IMAGO : 1,
	BOOTSTRAP : 2,
	TOGGLEABLE_CRCS : 3
}
var firmwareService = new FirmwareService()
var idService = new IdService()

// Console output colors
var error = clc.bgRed.white.bold
var success = clc.bgGreen.white.bold

var possiblyHasBadId = false;
var possiblyBadId = 0;
var flashTypeId = null;

if (args.length === 3) {
	// Default color of the terminal window
	defaultColor = '\x1b[37;40m'
} else {
	var defaultColor = args[3]
}

var useProgressBar
if(args.length > 4)
{
	useProgressBar = parseInt(args[4]) ? true : false;
}
else
{
	useProgressBar = true
}


var device = {
	path : args[2]
}

var client = cubelets.connect(device, function(err) {
	if (err) {
		exitWithError(err)
	} else {
		console.log('Connected. Starting upgrade...\n\n')
		start(client, true)
	}
})

client.on('disconnect', function() {
	console.log('Disconnected.')
})
function start(client, firstRun) {

	var tasks = [	disableCrcs,//4.0.0 blocks don't have CRCs turn them off'
								waitForOs4Block,//Wait for a block to be attached (if it isn't already)
								verifyTargetNeedsUpgrade,//Check that the firmware running is something less than 4.1.0
								logIfBadId,//Keep track of IDs that may have suffered from the ID snaffu
								flashUpgradeBootloader,//Flash the 'deep-memory bootloader'
								resetBT,//Reset the BT block to clear the RT table
								wait,//Allow time for the BT to boot
								enableCrcs,//The new bootloader should have CRCs now, so turn them on
								waitForOs4Block,//Make sure the block shows up
								flashModifiedPicBootstrap,//Flash the OS 4.1.0 bootloader and verification hex
								resetBT,//Reset to clear routing table
								wait,
								enableCrcs,
								waitForOs4Block,
								checkForBadID,//If the block got labeled as having a bad ID, and it still does, bail
								flashOs4Application,//Flash the 4.1.0 application
								resetBT,
								wait,
								enableCrcs,
								waitForOs4Block,
								waitForBlockRemoved,//Don't continue the process until the user takes off the block
								done]

	if (firstRun) {
		tasks.unshift(flashHostIfNeeded)
		tasks.unshift(checkBluetoothOperatingMode)
	}

	async.waterfall(tasks, function(err, result) {
		if (err) {
			exitWithError(err)
		}
		try {
			console.timeEnd("Upgraded in");
		} catch(err) {
		}

		flashTypeId = null;

		start(client, false)
		return
	})
}

function checkBluetoothOperatingMode(callback) {
	// Switch to the classic protocol
	client.setProtocol(ClassicProtocol)
	client.sendRequest(new ClassicProtocol.messages.KeepAliveRequest(), function(err, response) {
		if (err) {
			//console.log('Bluetooth block is running OS4 application.')
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

function flashHostIfNeeded(fromMode, callback) {
	if (fromMode === FirmwareType.BOOTSTRAP) {// Already in bootstrap mode
		console.log('Bluetooth seems to be in bootstrap mode, flashing to OS4 mode.')
		client.setProtocol(BootstrapProtocol)
		//Set host into bootloader from bootstrap
    client.setProtocol(BootstrapProtocol)
    var req = new BootstrapProtocol.messages.SetBootstrapModeRequest(1)
    client.sendRequest(req, function (err, res) {
      if(err)
      {
      	callback(err)
      	return
      }

      client.setProtocol(ImagoProtocol)
      var req = new ImagoProtocol.messages.SetModeRequest(0)
      client.sendRequest(req, function (err, res) {
      })
      setTimeout(function()
      {
      	flashHostCrcFirmware(callback)
      }, 1000)
    })

	} else if (fromMode === FirmwareType.CLASSIC) {// Classic
		client.setProtocol(ClassicProtocol)
		//determine host id
		//flash like normal
		console.log('Begin flashing bluetooth OS4 code from OS3 mode.')
		flashHostCrcFirmware(callback)
	} else {// Imago
		client.setProtocol(ImagoProtocol)
		//get mode to make sure it's running the firmware with toggleable CRCs
		client.sendRequest(new Protocol.messages.GetModeRequest(), function(err, response) {
			if(err)
			{
				callback(err)
				return
			}

			if(response.mode === 3)
			{//BT is running the correct firmware that has toggleable CRCs
				callback(null)
				return
			}
			else
			{
				client.setProtocol(ImagoProtocol)
				var req = new ImagoProtocol.messages.SetModeRequest(0)
        client.sendRequest(req, function (err, res) {
        }, 200)
        setTimeout(function()
        {
        	flashHostCrcFirmware(callback)
        }, 1000)
			}
		})
	}
}


function flashHostCrcFirmware(callback) {
	client.setProtocol(ClassicProtocol)
	var hex = fs.readFileSync('./crc_upgrade/hex/bt_app_crc_toggle/bluetooth_application.hex')
	var program = new ClassicProgram(hex)
	var block = new Block(99, 0, BlockTypes.BLUETOOTH)
	block._mcuType = MCUTypes.AVR
	var flash = new ClassicFlash(client, {
		skipSafeCheck : true,
		skipReadyCommand : true
	})
	flash.programToBlock(program, block, function(err) {
		client.setProtocol(ImagoProtocol)
		callback(err)
	})
	flash.on('progress', function(e) {
		printProgress('flashing', (e.progress/e.total))
	})
}


function disableCrcs(callback) {
	client.sendRequest(new Protocol.messages.SetCrcsRequest(0), function(err, response) {
		callback(err);
	})
}

function waitForOs4Block(callback) {
	getAllBlocks(function(err, blocks) {
		if (err) {
			callback(err)
			return
		}

		if (blocks.length > 1) {
			callback(new Error("Please attach just one Cubelet to update"));
			return
		} else if (blocks.length == 1) {
			console.log("Found: " + formatBlockName(blocks[0]))
			if( flashTypeId === null && blocks[0].getBlockType() !== BlockTypes.UNKNOWN)
			{
				flashTypeId = blocks[0].getBlockType().typeId
			}
			callback(null, blocks[0])
			return
		} else {
			console.log("Waiting for a Cubelet that needs to be updated.")
			client.once('event', function(message) {
				if ( message instanceof Protocol.messages.BlockAddedEvent) {
					waitForOs4Block(callback)
					return
				}
			})
		}
	})
}

function getAllBlocks(callback) {
	client.sendRequest(new Protocol.messages.GetAllBlocksRequest(), function(err, response) {
		if (err) {
			callback(err)
			return
		}
		if (response.blocks) {
			var blocks = []
			__.each(response.blocks, function(block) {
				var b = new Block(block.blockId, block.hopCount, Block.blockTypeForId(block.blockTypeId))
				b._mcuType = MCUTypes.PIC
				blocks.push(b)
			})
			callback(null, blocks)
		} else {
			callback(null, [])
		}
	})
}

function verifyTargetNeedsUpgrade(block, callback) {
	console.log("Verifying that the " + formatBlockName(block) + " cubelet needs upgraded.")
	var request = new ImagoProtocol.Block.messages.GetConfigurationRequest(block.getBlockId())
	client.sendBlockRequest(request, function(err, response) {
		if (err) {
			callback(new Error("Failed to fetch the block configuration. "+formatBlockName(block)+" may have already been upgraded."))
			return
		}
		else
		{
			if(flashTypeId === null)
			{
				flashTypeId = response.blockTypeId
			}

			//We only want to upgrade 4.0.x blocks
			if (response.bootloaderVersion.isLessThan(new Version(4, 1, 0))) {
				callback(null, block)
			} else {
				callback(new Error("This cubelet, " + formatBlockName(block) + " does not need to be updated"))
			}
		}
	})
}

function logIfBadId(block, callback) {
	//if the ID matches the bad ID pattern, store the ID to compare to later
	if (blockHasBadId(block.getBlockId())) {
		console.log("This block may have a corrupted ID. We will attempt to repair it.")
		possiblyHasBadId = true
		possiblyBadId = block.getBlockId()
	} else {
		//Clear the log of potentially bad IDs
		possiblyHasBadId = false
	}

	callback(null, block)
}

function flashUpgradeBootloader(block, callback) {
	//Flash the deep memory bootloader
	console.log("\nBegin flashing the deep-memory temporary bootloader.")

	var hex = fs.readFileSync('./crc_upgrade/hex/crc_update_bootloader/crc_update_bootloader.hex')
	var program = new ImagoProgram(hex)

	var flash = new ImagoFlash(client, {
		skipSafeCheck : true
	})

	var totalSize = program.data.length
	var listener = function(e) {
		if ( e instanceof Protocol.messages.FlashProgressEvent) {
			printProgress('flashing', e.progress / totalSize)
		}
	}

	client.on('event', listener);

	flash.programToBlock(program, block, function(err) {
		client.removeListener('event', listener);
		if (err) {
			callback(err)
			return
		}
		console.log("Successfully flashed the deep-memory bootloader.")
		console.log()
		console.log()
		callback(null)
	})

	flash.on('progress', function(e) {
		printProgress('uploading', e.progress / e.total)
	})
}

function flashModifiedPicBootstrap(block, callback) {
	//Flash the pic bootloader + verification app
	console.log("\n\nFlashing the 4.1.0 Bootloader and Bootloader Verification application.")

	var blockType = Block.blockTypeForId(flashTypeId)
	block._blockType = blockType

	var hex = fs.readFileSync('./crc_upgrade/hex/boot_id_fix/' + block.getBlockType().name + "_bootstrap.hex")
	var program = new ImagoProgram(hex)
	var flash = new ImagoFlash(client, {
		skipSafeCheck : true
	})

	var totalSize = program.data.length
	var listener = function(e) {
		if ( e instanceof Protocol.messages.FlashProgressEvent) {
			printProgress('flashing', e.progress / totalSize)
		}
	}

	client.on('event', listener);

	flash.programToBlock(program, block, function(err) {
		client.removeListener('event', listener);
		if (err) {
			callback(err)
			return
		}
		console.log("Successfully flashed the 4.1.0 bootloader")
		console.log()
		console.log()
		callback(null)
	})
	bar = new ProgressBar('uploading [:bar] :percent', {
		width : 40,
		total : 100
	});
	flash.on('progress', function(e) {
		printProgress('uploading', e.progress / e.total)
		//console.log('progress', '(' + e.progress + '/' + e.total + ')')
	})
}

function checkForBadID(block, callback) {
	//Check to see if the block could still have a bad ID, bail if so
	if (possiblyHasBadId) {
		if (possiblyBadId === block.getBlockId()) {
			console.error(error("Was unable to fix the ID corruption.\nThis Cubelet will need to be re-flashed using the wand."))
			setTimeout(function()
			{
				callback(new Error("Please make sure to remove the block with the bad ID"))
			}, 10000)
			return
		}
		else
		{
			console.log("Successfully repaired a bad ID.")
		}
	}
	callback(null, block)
}

function flashOs4Application(block, callback) {
	var blockType = Block.blockTypeForId(flashTypeId)
	block._blockType = blockType
	//Flash the usual application
	var applicationHex = fs.readFileSync('./upgrade/hex/application/' + block.getBlockType().name + ".hex")
	var program = new ImagoProgram(applicationHex)
	flash = new ImagoFlash(client)

	bar = new ProgressBar('uploading [:bar] :percent', {
		width : 40,
		total : 100
	});

	var totalSize = program.data.length
	var listener = function(e) {
		if ( e instanceof Protocol.messages.FlashProgressEvent) {
			printProgress('flashing', e.progress / totalSize)
		}
	}
	client.on('event', listener);

	flash.on('progress', function(e) {
		printProgress('uploading', e.progress / e.total)
		//console.log('progress', '(' + e.progress + '/' + e.total + ')')
	})
	flash.programToBlock(program, block, function(err) {
		client.removeListener('event', listener);
		if (err) {
			callback(err)
			return
		}
		console.log("\nSuccessfully flashed " + block.getBlockType().name + " firmware to " + block.getBlockId() + ".")
		console.log()
		console.log()
		callback(null)
	})
}

function waitForBlockRemoved(block, callback) {
	client.once('event', function(message) {
		if ( message instanceof Protocol.messages.BlockRemovedEvent) {
			callback(null)
			return
		}
	})

	//process.stdout.write(clc.erase.screen);
	printSuccessMessage("Successfully upgraded " + formatBlockName(block) + " to v4.1.0")
	console.log("\n\nPlease remove " + formatBlockName(block) + " and attach the next block to be updated.\n\n\n")
}

function wait(howLong, callback) {
	process.stdout.write("Waiting....")
	setTimeout(function() {
		console.log("done.")
		callback(null)
	}, howLong)
}

function resetBT(callback) {
	client.sendCommand(new ImagoProtocol.messages.ResetCommand())
	callback(null, 1000)
}

function enableCrcs(callback) {
	client.sendRequest(new Protocol.messages.SetCrcsRequest(1), function(err, response) {
		callback(err);
	})
}

function done(callback) {
	callback(null, 'done')
}

function printProgress(type, progress)
{
	if(useProgressBar)
	{
		if(type === 'flashing')
		{
			bar.update(progress)
		}
		else if(type === 'uploading')
		{
			bar.update(progress)
			if (progress === 1) {
				bar = new ProgressBar('flashing [:bar] :percent', {
					width : 40,
					total : 100
				});
			}
		}
	}
	else if (progress === 1)
	{
		console.log('done')
	}
	else
	{
		progress = parseInt(progress * 100)
		if(type !== 'uploading' || (type === 'uploading' && (progress % 10) === 0 && progress !== 0))
		{
			console.log(""+ type+": " + progress + "%")
		}

	}

}

function blockHasBadId(blockId) {

	var ID0 = ((blockId & 0x0000FF));
	var ID1 = ((blockId & 0x00FF00) >> 8);
	var ID2 = ((blockId & 0xFF0000) >> 16);

	if (ID2 === ID0 && ID2 === 0x03) {
		return true;
	} else {
		return false;
	}
}

function parseVersion(floatValue) {
	var major = Math.floor(floatValue)
	var minor = Math.floor(10 * (floatValue - major))
	return new Version(major, minor)
}

function formatBlockName(block) {
	return block.getBlockType().name.capitalizeFirstLetter() + ' (' + block.getBlockId() + ')'
}

String.prototype.capitalizeFirstLetter = function() {
	return this.charAt(0).toUpperCase() + this.slice(1)
}
function printSuccessMessage(msg) {
	//80 blanks spaces to fill a complete line
	var fullLine = '                                                                                '
	// process.stdout.write(success(fullLine))
	process.stdout.write(success(fullLine))
	process.stdout.write(success(msg + (fullLine.substring(fullLine.length - msg.length))))
	process.stdout.write(success(fullLine))
	process.stdout.write(defaultColor)
}

function exitWithError(err) {
	console.error(error(err))
	if (client) {
		try{
			client.disconnect(function() {
				process.exit(1)
			})
		}
		catch(err)
		{
			process.exit(1)
		}
		client.disconnect(function() {
			process.exit(1)
		})
	} else {
		process.exit(1)
	}
}
