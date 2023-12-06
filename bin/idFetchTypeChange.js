var args = process.argv
if (args.length !== 3) {
	console.log('Usage: node bin/idFetchTypeChange PATH')
	process.exit(1)
}

var device = {
	path : args[2],//If using Serial
	address : args[2],//If using BluetoothSerial
	channelID : 1
}
var clientType = 'serial';
if(args[2].indexOf(':') > -1){
	clientType = 'bluetoothSerial';
}

var fs = require('fs')
var ImagoProtocol = require('../protocol/imago')
var ImagoProgram = ImagoProtocol.Program
var ImagoFlash = ImagoProtocol.Flash
var cubelets = require('../index')(clientType)
var Protocol = cubelets.Protocol
var Block = require('../block')
var BlockTypes = require('../blockTypes')
var MCUTypes = require('../mcuTypes')
var __ = require('underscore')

var stdin = process.stdin

var client = cubelets.connect(device, function(err) {
	if (err) {
		exitWithError(err)
	} else {
		console.log('Connected.')
		try
		{
			client.setMaxListeners(0);
		}
		catch(err)
		{

		}
		start(client)
	}
})
client.on('disconnect', function() {
	console.log('Disconnected.')
})

function start(client) {
	console.log('')
	console.log('')
	console.log('')
	promptForAnyKey('To detect a Cubelets press any key.\n', function() {
		fetchBlocks(function(err, blocks) {
			if (err) {
				exitWithError(err)
			}
			printBlocksFound(blocks)
			if (blocks.length === 0) {
				console.log("No Cubelets were detected.")
				start(client)
			} else if (blocks.length === 1 && blocks[0].getBlockType() !== BlockTypes.BLUETOOTH) {
				askToChangeCubeletType(blocks[0], function() {
					start(client)
				})
			} else {
				console.log("To switch a Cubelets type, please attach just that Cubelet.")
				start(client)
			}
		})
	})
}

function fetchBlocks(callback) {
	client.sendRequest(new Protocol.messages.GetAllBlocksRequest(), function(err, response) {
		if (err) {
			callback(err)
			return
		}
		var blocks = []
		var count = 0;
		if(response.blocks.length == 0)
		{
			callback(null, [])
			return
		}
		__.each(response.blocks, function(block) {
			//getConfig to retrieve versions
			var request = new Protocol.Block.messages.GetConfigurationRequest(block.blockId)

			if(parseInt(block.blockTypeId) == 4)
			{
				client.sendRequest(new Protocol.messages.GetConfigurationRequest(), function(err, blockInfo) {
					blockInfo.blockTypeId = 4;
					if(err){
						callback(err)
						return
					}
					var b = new Block(block.blockId, block.hopCount, Block.blockTypeForId(block.blockTypeId))
					if(blockInfo)
					{
						b.mode = blockInfo.mode
						b._applicationVersion = blockInfo.applicationVersion
						b._bootloaderVersion = blockInfo.bootloaderVersion
						b._hardwareVersion = blockInfo.hardwareVersion
						b._blockType = (Block.blockTypeForId(blockInfo.blockTypeId) != BlockTypes.UNKNOWN ? Block.blockTypeForId(blockInfo.blockTypeId) : block._blockType);
					}
					blocks.push(b)
					if(blocks.length == response.blocks.length){
						callback(null, blocks)
						return
					}
				})
			}
			else {
				client.sendBlockRequest(request, function(err, blockInfo) {
					var b = new Block(block.blockId, block.hopCount, Block.blockTypeForId(block.blockTypeId))
					if(blockInfo)
					{
						b.mode = blockInfo.mode
						b._applicationVersion = blockInfo.applicationVersion
						b._bootloaderVersion = blockInfo.bootloaderVersion
						b._hardwareVersion = blockInfo.hardwareVersion
						b._blockType = (Block.blockTypeForId(blockInfo.blockTypeId) != BlockTypes.UNKNOWN ? Block.blockTypeForId(blockInfo.blockTypeId) : block._blockType);
					}
					blocks.push(b)
					if(blocks.length == response.blocks.length){
						callback(null, blocks)
						return
					}
				})
			}
		})

	})
}

function printBlocksFound(blocks) {
	console.log('Blocks Found:')
	__.each(blocks, function(block) {
		console.log('  ' + formatBlockName(block))
		console.log('    Application Version: v' + block._applicationVersion.toString())
		console.log('    Bootloader Version: v' + block._bootloaderVersion.toString())
		console.log('    Mode: ' + (block.mode ? 'Application' : 'Bootloader'))
	})
	console.log('')
}

function askToChangeCubeletType(block, callback) {
	block._mcuType = MCUTypes.PIC
	promptYesOrNo('Would you like to change the block type for ' + block.getBlockId() + '?', true, function(val) {
		if (val) {
			askForResponse("\nEnter the first three characters of the new type: ", function(response) {
				if (response.length < 3) {
					console.log("\nInvalid Cubelet type.")
					if (callback) {
						callback()
					}
				} else {
					var convertType = null
					//Loop over type and try to figure out what they mean
					__.each(BlockTypes, function(blockType) {
						if (blockType.name.substring(0, response.length) === response) {
							convertType = blockType
						}
					})
					if (convertType) {
						convertBlockToType(block, convertType, callback)
					} else {
						console.log("\nInvalid Cubelet type.")
						if (callback) {
							callback()
						}
					}
				}
			})
		} else {
			if (callback) {
				callback()
			}
		}
	})
}


function convertBlockToType(block, convertType, callback) {
	var converterHex = fs.readFileSync('./upgrade/hex/pic_type_switch/' + convertType.name + ".hex")
	var program = new ImagoProgram(converterHex)
	var flash = new ImagoFlash(client, {
		skipSafeCheck : true
	})
	console.log("Program to block")
	flash.programToBlock(program, block, function(err) {
		console.log(err)
		console.log("Program to block return")
		if (err) {
			exitWithError(err)
		} else {

			client.sendCommand(new ImagoProtocol.messages.ResetCommand())
			//Wait a bit
			setTimeout(function() {
				fetchBlocks(function(err, blocks) {
					console.log(err)
					console.log()
					if (err) {
						exitWithError(err)
						return;
					}

					if (blocks.length === 1) {

						block = blocks[0];
						block._mcuType = MCUTypes.PIC

						var applicationHex = fs.readFileSync('./upgrade/hex/application/' + convertType.name + ".hex")
						var program = new ImagoProgram(applicationHex)
						flash = new ImagoFlash(client)
						flash.on('progress', function(e) {
							console.log('progress', '(' + e.progress + '/' + e.total + ')')
						})
						flash.programToBlock(program, block, function(err) {
							if (err) {
								exitWithError(err)
							} else if (callback) {
								console.log("\nSuccessfully flashed " + convertType.name + " firmware to " + block.getBlockId() + ".")
								client.sendCommand(new ImagoProtocol.messages.ResetCommand())
								callback()
							}
						})
					}
				})
			}, 200);
		}
	})
	flash.on('progress', function(e) {
		console.log('progress', '(' + e.progress + '/' + e.total + ')')
	})
}


function askForResponse(message, callback) {
	if(stdin.isTTY)
	{
		stdin.setRawMode(true)
	}

	stdin.resume()
	stdin.setEncoding('utf8')

	process.stdout.write(message)
	var keyLog = []

	stdin.on('data', function keyCallback(key) {
		if (key == '\u0003') {// ctrl-c
			process.exit()
		} else if (key == '\u000D') {//Enter
			stdin.pause()
			stdin.removeListener('data', keyCallback)
			console.log('')
			if (callback) {
				var resp = keyLog.join('').toLowerCase()
				callback(resp)
			}
		} else {
			keyLog.push(key)
			process.stdout.write(key)
		}
	})
}

function promptForAnyKey(message, callback) {
	if(stdin.isTTY)
	{
		stdin.setRawMode(true)
	}

	stdin.resume()
	stdin.setEncoding('utf8')

	console.log(message)
	stdin.once('data', function(key) {
		if (key == '\u0003') {
			process.exit()
		}// ctrl-c
		stdin.pause()
		if (callback) {
			callback()
		}
	})
}

function promptYesOrNo(message, _default, callback) {
	if(stdin.isTTY)
	{
		stdin.setRawMode(true)
	}

	stdin.resume()
	stdin.setEncoding('utf8')

	message = message + ( _default ? ' [yes]: ' : ' [no]: ')
	process.stdout.write(message)
	var keyLog = []
	stdin.on('data', function keyCallback(key) {
		if (key == '\u0003') {// ctrl-c
			process.exit()
		} else if (key == '\u000D') {
			stdin.pause()
			stdin.removeListener('data', keyCallback)
			console.log('')
			if (keyLog.length === 0) {
				if (callback) {
					callback(_default)
				}
			} else if (callback) {
				var resp = keyLog.join('').toLowerCase()
				if (resp === 'yes' || resp == 'y') {
					callback(true)
				} else if (resp === 'no' || resp == 'n') {
					callback(false)
				} else {
					callback(false)
				}
			}
		} else if (key === ' ') {
			if (keyLog.length === 0) {
				stdin.pause()
				stdin.removeListener('data', keyCallback)
				console.log('')
				if (callback) {
					callback(_default)
				}
			} else {
				process.stdout.write(key)
			}
		} else {
			keyLog.push(key)
			process.stdout.write(key)
		}
	})
}

function formatBlockName(block) {
	return block.getBlockType().name.capitalizeFirstLetter() + ' (' + block.getBlockId() + ')'
}

String.prototype.capitalizeFirstLetter = function() {
	return this.charAt(0).toUpperCase() + this.slice(1)
}
function exitWithError(err) {
	console.error(err)
	if (client) {
		client.disconnect(function() {
			process.exit(1)
		})
	} else {
		process.exit(1)
	}
}
