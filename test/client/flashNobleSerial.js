var cubelets = require('../../index')('nobleSerial');
var test = require('tape')
var fs = require('fs')
var config = require('../config')
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
var debug = require('debug')('cubelets:nobleSerialTest')

const FLASH_FOREVER = true
var firmwareService = new ImagoFirmwareService()
var client = null;
var flashCount = 1;
var protocolConfig = {
  "writeDelay": 0,
  "writeWithResponseDelay": 0,
  "chunkSize": 20,
  "useReliableProtocol": false,
  "connectionIntervalMin": 6,
  "connectionIntervalMax": 6,
  "supervisorTimeout": 300,
  "slaveLatency": 0
}


function deviceAddedCallback(device){
  console.log("Device Added", device);
  cubelets.stopDeviceScan(function(){
    client = cubelets.connect(device, function(err){
      if(err){
        console.log(err);
        return;
      }
      client.on('disconnect', function() {
        debug("Disconnected!");
      });
      console.log("Connected")
      //var req = new Protocol.messages.SetModeRequest(0)
      //client.sendRequest(req, function (err, res) {
      //}, 200)
      setTimeout(function(){
        client.getConnection().updateProtocolConfig(protocolConfig)
        setTimeout(function(){
          findTargetAndFlash();
        }, 500)
      }, 500)


    })
  })
}
function deviceUpdatedCallback(device){
  console.log("Device Updated: ", device);
  //console.log(device);
}

console.log("Start scan")
cubelets.startDeviceScan(deviceAddedCallback, deviceUpdatedCallback, function(err){
  console.log(err);
});

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

var totalSize;
function progress(e){
  var progress = ((e.progress / e.total) * 100).toFixed(2)
  console.log("Uploading..." + progress + "%")
}
var listener = function(e) {
  if ( e instanceof Protocol.messages.FlashProgressEvent) {
    var progress = ((e.progress / totalSize) * 100).toFixed(2)
    console.log("Flashing..." + progress + "%")
  }
}

function flashTargetBlock(block) {
	console.log("About to flash: ")
	fetchLatestFirmware(block, function(err, block, application) {
		console.log("Fetched Latest Firmware")
		var flash = new ImagoFlash(client)
		flash.on('progress', progress)
		totalSize = application.data.length

		client.on('event', listener);
		setTimeout(function()
		{
        console.log("Calling flash")
				flash.programToBlock(application, block, function(err) {
  				if (err) {
  					client.disconnect();
  					console.log(err)
  					console.log("Flashing failed: ", flashCount)
  					process.exit();
  				} else {
            client.off('event', listener)
            flash.off('progress', listener)
  					//client.disconnect();
  					console.log("Flashing Success: ", flashCount++)
            if(FLASH_FOREVER){
              setTimeout(function(){flashTargetBlock(block)}, 2000);
            }
            else{
              client.disconnect();
              setTimeout(process.exit, 2000);
            }
  				}
  			});
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
