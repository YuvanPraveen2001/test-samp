var test = require('tape')
var fs = require('fs')
var config = require('../config')
var cubelets = require('../../index')('bluetoothSerial')
var Protocol = cubelets.Protocol
var Block = require('../../block')
var BlockTypes = require('../../blockTypes')
var MCUTypes = require('../../mcuTypes')
var InfoService = require('../../services/info')
var FirmwareService = require('../../services/firmware')
var ImagoFirmwareService = cubelets.ImagoFirmwareService;
var ImagoProtocol = require('../../protocol/imago')
var ImagoProgram = ImagoProtocol.Program
var ImagoFlash = ImagoProtocol.Flash
//var Version = require('../version')
var __ = require('underscore')
var prompt = require('cli-prompt')

var firmwareService = new ImagoFirmwareService()
var client = null;
//List paired Devices
//Select Paired device
//Restore default firmware for the block type

cubelets.getDevices(function(devices) {
	console.log("Devices", devices)
	var i = 0;
	__.each(devices, function(device) {
		console.log("" + i + ": " + device.name)
		i++;
	})
	prompt("Select the Cubelet: ", function(val) {
		var device = devices[parseInt(val)];
		console.log(device)
		if (device.services) {
			device.channelID = device.services[0].channelID;
		}

			device.channelID = 1;

		client = cubelets.connect(device, function(err) {
			if (err) {
				console.log("Failed to connect.")
				process.exit()
			} else {
				console.log("Connected")
				findTargetAndFlash();
			}
		}, function(err) {

		})
	})
})
function findTargetAndFlash() {
	client.sendRequest(new Protocol.messages.GetAllBlocksRequest(), function(err, response) {
		if (err) {
			console.error(err)
			process.exit()
		} else if (response.blocks.length < 1) {
			console.log("Couldn't find a target block. Please make sure a block is connected and try again.")
			process.exit()
		}
		//For simplicity, store the first block
		var targetBlockInfo = response.blocks[0]
		//Create an actual Block object
		var targetBlock = new Block(targetBlockInfo.blockId, targetBlockInfo.hopCount, Block.blockTypeForId(targetBlockInfo.blockTypeId), MCUTypes.PIC)
		var request = new ImagoProtocol.Block.messages.GetConfigurationRequest(targetBlock.getBlockId())
		client.sendBlockRequest(request, function(err, response) {
			if (err) {
				console.log(err)
				process.exit()
			}

			console.log(response)

			//Store the block type and versions that came back from the Get Configuration request
			targetBlock._blockType = Block.blockTypeForId(response.blockTypeId)
			targetBlock._applicationVersion = response.applicationVersion
			targetBlock._bootloaderVersion = response.bootloaderVersion
			targetBlock._hardwareVersion = response.hardwareVersion

			//TODO: Hack to store the correct MCU type.
			targetBlock._mcuType = MCUTypes.PIC

			flashTargetBlock(targetBlock)
		})
	})
}

function flashTargetBlock(block) {
	console.log("About to flash: ")
	fetchLatestFirmware(block, function(err, block, application) {
		console.log("Fetched Latest Firmware")
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
		setTimeout(function()
		{
				flash.programToBlock(application, block, function(err) {
				if (err) {
					client.disconnect();
					console.log(err)
					console.log("Flashing failed")
					process.exit();
				} else {
					client.disconnect();
					console.log("Flashing Success")
					setTimeout(process.exit, 1000);
					//process.exit();
				}
			})
			}, 0)

	})
}

function fetchLatestFirmware(block, callback) {
	firmwareService.fetchLatestHex(block, function(err, response) {
		if (err) {
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
