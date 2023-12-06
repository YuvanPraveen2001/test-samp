var args = process.argv
if (args.length < 3) {
  console.log('Usage: node bin/downgrade PATH {{CRCS_ENABLED}} {{DEFAULT_COLOR}}')
  process.exit(1)
}

var fs = require('fs')
var async = require('async')
// var prompt = require('cli-prompt')
// var __ = require('underscore')
var clc = require('cli-color')

var cubelets = require('../index')()
var Block = require('../block')
var BlockTypes = require('../blockTypes')
var MCUTypes = require('../mcuTypes')
// var CompatibilityCheck = require('../upgrade/compatibilityCheck')
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
  CLASSIC: 0,
  IMAGO: 1,
  BOOTSTRAP: 2
}
var firmwareService = new FirmwareService()
// var UpdateService = require('../services/update')
var idService = new IdService()

// Console output colors
var error = clc.bgRed.white.bold
var success = clc.bgGreen.white.bold

//Holds the block info for the Cubelet being downgraded
var downgradeBlock


if (args.length === 3) {
	//No optional params passed

	//Default with CRCs on
	crcsEnabled = 1;
  // Default color of the terminal window
  defaultColor = '\x1b[37;40m'
}
else if(args.length === 4)
{
	//CRCs Enabled was passed in, but no color
	crcsEnabled = parseInt(args[3])
	// Default color of the terminal window
  defaultColor = '\x1b[37;40m'
}
else {
	crcsEnabled = parseInt(args[3])
  var defaultColor = args[4]
}

var device = {
  path: args[2]
}

var client = cubelets.connect(device, function (err) {
  if (err) {
    exitWithError(err)
  } else {
    console.log('Connected. Starting upgrade...')
    start(client, true)
  }
})

client.on('disconnect', function () {
  console.log('Disconnected.')
})
function start (client, firstRun) {

	var tasks = [
  	waitForOs4Block,
  	jumpToOs4Mode,
  	//wait,
  	//setCRCMode,
  	wait,
  	findOs4AndFlashBootloader,
  	jumpToDiscoveryWaitForOs3,
  	jumptoOs3Mode,
  	downloadTargetHex,
  	flashOs3Application,
  	updateDataStore,
  	wait,
  	jumpToDiscoveryFromOs3,
  	verifyOs3
  ]

  if(firstRun)
  {
  	tasks.unshift(flashBootstrapIfNeeded)
  	tasks.unshift(checkBluetoothOperatingMode)
  }

  async.waterfall(tasks, function (err, result) {
    if (err) {
      exitWithError(err)
    }
    try
    {
    	console.timeEnd("Downgraded in");
    }
    catch(err){}

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

function flashBootstrapIfNeeded (fromMode, callback) {
  if (fromMode === FirmwareType.BOOTSTRAP) { // Already in bootstrap mode
    console.log('Bluetooth already in bootstrap mode, no need to update.')
    callback(null)
  } else if (fromMode === FirmwareType.CLASSIC) { // Classic
    client.setProtocol(ClassicProtocol)
    /* client.sendData(new Buffer(['L'.charCodeAt(0)]), function(err) {
     if (err) {
     callback(err)
     return
     }*/
    // Determine Host ID
  	var req = new ClassicProtocol.messages.GetNeighborBlocksRequest()
  	client.sendRequest(req, function (err, res) {
	    if (err) {
	      callback(err)
	    } else {
	    	var originBlockId = res.originBlockId
      	if (originBlockId > 0) {
      		console.log('Begin flashing bluetooth bootstrap code from OS3 mode.')
    			flashBootstrapFromBootloader(originBlockId, false, callback)
      	}
      	else
      	{
      		callback(new Error('Host block not found.'))
      	}
	    }
    })
  // })
  } else { // Imago
    client.setProtocol(ImagoProtocol)
    client.sendRequest(new ImagoProtocol.messages.GetConfigurationRequest(), function (err, res) {
    	if(err)
    	{
    		callback(err)
    		return
    	}
    	var hostId = res.blockId;
    	var req = new ImagoProtocol.messages.SetModeRequest(0)
    	client.sendRequest(req, function (err, res) {
	      console.log('Begin flashing bluetooth bootstrap code from OS4 mode.')
	      setTimeout(function () {
	        flashBootstrapFromBootloader(hostId, true, callback)
	      }, 4000)
	    }, 200)
    })
  }
}

function flashBootstrapFromBootloader (hostId, shouldSkipReady, callback) {
  var hex = fs.readFileSync('./upgrade/hex/bluetooth_bootstrap.hex')
  var program = new ClassicProgram(hex)
  client.setProtocol(ClassicProtocol)

  var hostBlock = new Block(hostId, 0, BlockTypes.BLUETOOTH)
  hostBlock._mcuType = MCUTypes.AVR

  var flash = new ClassicFlash(client, {
    skipSafeCheck: true,
  	skipReadyCommand: shouldSkipReady
  })

  flash.programToBlock(program, hostBlock, function (err) {
      callback(err)
  })

  flash.on('progress', function (e) {
  	console.log('progress', '(' + e.progress + '/' + e.total + ')')
  })
}

function waitForOs4Block (callback) {
	console.log("")
	console.log("Please attach the OS4 block you wish to downgrade.")
  client.setProtocol(BootstrapProtocol)
  function waitForBlockEvent (e) {
    if (e instanceof BootstrapProtocol.messages.BlockFoundEvent) {
      if (e.firmwareType === FirmwareType.IMAGO) {
      	console.log("Found an OS4 block on face " + e.faceIndex)
        client.removeListener('event', waitForBlockEvent)
        callback(null)
        return
      }
    }
  }

  client.on('event', waitForBlockEvent)
}

function setCRCMode(callback)
{
 	client.setProtocol(ImagoProtocol)
	client.sendRequest(new ImagoProtocol.messages.SetCrcsRequest(crcsEnabled), function(err, response) {
		callback(err, 1000);
	})
}

function jumpToOs4Mode (callback) {
	console.time("Downgraded in");
  client.setProtocol(BootstrapProtocol)
  client.sendRequest(new BootstrapProtocol.messages.SetBootstrapModeRequest(FirmwareType.IMAGO), function (err, response) {
    if (err) {
      callback(err)
    } else if (response.mode === FirmwareType.IMAGO) {
      callback(null, 1000)
    } else {
      callback(new Error('Failed to set host into OS4 mode'))
    }
  })
}

function wait (howLong, callback) {
  setTimeout(function () {
    callback(null)
  }, howLong)
}

function findOs4AndFlashBootloader (callback) {
  client.setProtocol(ImagoProtocol)
  client.fetchNeighborBlocks(function (err, neighborBlocks) {
    if (err) {
      callback(err)
      return
    }
    if (!neighborBlocks || neighborBlocks.length <= 0) {
      callback(new Error('Failed to find OS4 block'))
      return
    }
    var targetBlock
    targetBlock = neighborBlocks[0]
    targetBlock._mcuType = MCUTypes.PIC

    flashOs3BootloaderFromOs4(targetBlock, callback)
  })
}

function flashOs3BootloaderFromOs4 (targetBlock, callback) {

	console.log("Begin flashing OS3 bootloader to " + formatBlockName(targetBlock))
  var hex = fs.readFileSync('./downgrade/pic_downgrader.hex')
  var program = new ImagoProgram(hex)
  var flash = new ImagoFlash(client, {
    skipSafeCheck: true
  })
  flash.programToBlock(program, targetBlock, function (err) {
    callback(err, targetBlock)
  })
  flash.on('progress', function (e) {
    console.log('progress', '(' + e.progress + '/' + e.total + ')')
  })
}

function jumpToDiscoveryWaitForOs3 (targetBlock, callback) {
  client.sendCommand(new ImagoProtocol.messages.ResetCommand())
  setTimeout(function () {
    client.setProtocol(BootstrapProtocol)
    var timer = setTimeout(function () {
      client.removeListener('event', waitForBlockEvent)
      callback(new Error('Failed to discover OS3 bootloader block'))
      return
    }, 3000)
    function waitForBlockEvent (e) {
      if (e instanceof BootstrapProtocol.messages.BlockFoundEvent) {
        clearTimeout(timer)
        if (e.firmwareType === FirmwareType.CLASSIC) {
          client.removeListener('event', waitForBlockEvent)
          callback(null, targetBlock)
          return
        }
      }
    }

    client.on('event', waitForBlockEvent)
  })
}

function jumptoOs3Mode (targetBlock, callback) {
  client.setProtocol(BootstrapProtocol)
  client.sendRequest(new BootstrapProtocol.messages.SetBootstrapModeRequest(FirmwareType.CLASSIC), function (err, response) {
    client.setProtocol(ClassicProtocol)
    if (err) {
      callback(err)
    } else if (response.mode === FirmwareType.CLASSIC) {
      callback(null, targetBlock)
    } else {
      callback(new Error('Failed to jump from bootstrap to OS3 mode'))
    }
  })
}

function downloadTargetHex (targetBlock, callback) {
  var infoService = new InfoService()
  infoService.fetchBlockInfo([targetBlock], function (err, infos) {
    if (err) {
      callback(err)
      return
    }
    var info = infos[0]
    var version = info.latestFirmwareVersion
    var blockType = Block.blockTypeForId(info.blockTypeId)
    targetBlock._blockType = blockType
    targetBlock._mcuType = Block.mcuTypeForId(info.mcuTypeId)

    var textVersion = Os3LatestVersions[targetBlock.getBlockType().name.toUpperCase()].version
    if(textVersion === '2.6')
    {
    	version = new Version(2, 6, 0)
    }
    else if(textVersion === '2.7')
    {
    	version = new Version(2, 7, 0)
    }
    else if (textVersion === '2.8')
    {
    	version = new Version(2, 8, 0)
    }
    else
    {
    	version = new Version(2, 6, 0)
    }

    firmwareService.downloadVersion(targetBlock, version, function (err, hex) {
      if (err) {
        callback(new Error('Failed to fetch hex file for '+formatBlockName(targetBlock) + ' version: ' + version.toString()))
        return
      }
      callback(null, targetBlock, hex)
    })
  })
}

function flashOs3Application (targetBlock, targetHex, callback) {
	console.log("Begin flashing OS3 application to " + formatBlockName(targetBlock))
  var program = new ClassicProgram(targetHex)

  downgradeBlock = targetBlock

  // XXX(donald): hack to not send reset command
  targetBlock._applicationVersion = new Version(0, 0, 0)

  var flash = new ClassicFlash(client, {
    skipSafeCheck: false
  })
  flash.programToBlock(program, targetBlock, function (err) {
    if (err) {
      callback(err)
    }
  })
  flash.on('progress', function (e) {
    console.log('progress', '(' + e.progress + '/' + e.total + ')')
  })
  flash.on('success', function (e) {
    callback(e, targetBlock)
  })
  flash.on('error', function (e) {
    callback(e)
  })
}

function updateDataStore (targetBlock, callback) {
  // Update datastore with new version
  var version = Os3LatestVersions[targetBlock.getBlockType().name.toUpperCase()].version
  idService.addId(targetBlock, version, function (err) {
    if (err) {
      console.log(err)
    }
  })
  callback(null, 1000)
}

function jumpToDiscoveryFromOs3 (callback) {
  client.sendCommand(new ClassicProtocol.messages.ResetCommand())
  callback(null)
}

function verifyOs3 (callback) {
  setTimeout(function () {
    client.setProtocol(BootstrapProtocol)
    var timer = setTimeout(function () {
      client.removeListener('event', waitForBlockEvent)
      callback(new Error('Failed to find OS3 application block'))
      return
    }, 3000)
    function waitForBlockEvent (e) {
      if (e instanceof BootstrapProtocol.messages.BlockFoundEvent) {
        clearTimeout(timer)
        client.removeListener('event', waitForBlockEvent)

        printSuccessMessage('Successfully downgraded block ' + formatBlockName(downgradeBlock) + ' to OS3.')
        console.log("")
        callback(null, 'done')
      }
    }

    client.on('event', waitForBlockEvent)
  })
}

function parseVersion (floatValue) {
  var major = Math.floor(floatValue)
  var minor = Math.floor(10 * (floatValue - major))
  return new Version(major, minor)
}

function formatBlockName (block) {
  return block.getBlockType().name.capitalizeFirstLetter() + ' (' + block.getBlockId() + ')'
}

String.prototype.capitalizeFirstLetter = function () {
  return this.charAt(0).toUpperCase() + this.slice(1)
}

function printSuccessMessage (msg) {
  //80 blanks spaces to fill a complete line
  var fullLine = '                                                                                '
  // process.stdout.write(success(fullLine))
  process.stdout.write(success(fullLine))
  process.stdout.write(success(msg + (fullLine.substring(fullLine.length - msg.length))))
  process.stdout.write(success(fullLine))
  process.stdout.write(defaultColor)
}

function exitWithError (err) {
  console.error(error(err))
  if (client) {
    client.disconnect(function () {
      process.exit(1)
    })
  } else {
    process.exit(1)
  }
}
