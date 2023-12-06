/*
  Testing major upgrades, start block out in any of the potential cases
*/
var args = process.argv
if (args.length !== 3) {
  console.log('Usage: node bin/upgradeBootloader PATH')
  process.exit(1)
}

var device = {
  path: args[2]
}

var cubelets = require('../../index')()
var Protocol = cubelets.Protocol
var Block = require('../../block')
var __ = require('underscore')
var ImagoProtocol = require('../../protocol/imago')
var UpgradeBootloader = require('../../upgrade/upgradeBootloader')
var fs = require('fs')
var MCUTypes = require('../../mcuTypes')

var ProgressBar = require('progress')

var uploadBar = new ProgressBar('Uploading [:bar] :percent', {
  width: 40,
  total: 100
})
var flashBar = new ProgressBar('Flashing [:bar] :percent', {
  width: 40,
  total: 100
})

var uploadDone = false
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

var upgradeBootloader = new UpgradeBootloader(client)
client.on('disconnect', function () {
  console.log('Disconnected.')
})

/*
 * Status updates for the entire process
 * Includes:
 * 					- {'status' : 'start'}
 * 					- {'status' : 'succcess'}
 * 					- {'status' : 'error',
								'error' : err
							}
 */
upgradeBootloader.on('upgradeBootloader', function (data) {
  // console.log(data)
  switch (data.status) {
    case 'start':
      break
    case 'success':
      console.log('Finished upgrading bootloader and application.')
      process.exit()
      break
    case 'error':
      console.log(data.error)
      break
  }
})

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
upgradeBootloader.on('flashDeepMemoryBootloader', function (data) {
  // console.log(data)
  switch (data.status) {
    case 'start':
      console.log('Flashing Deep Memory Bootloader')
      uploadDone = false
      break
    case 'flashProgress':
      uploadDone = true
      flashBar.update(data.progress)
      break
    case 'uploadProgress':
      if (!uploadDone) {
        if (data.progress === 1) {
          uploadDone = true
        }

        uploadBar.update(data.progress)
      }
      break
    case 'success':
      flashBar.update(1)
      console.log('Done.\n')
      break
  }
})

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
upgradeBootloader.on('flashBootloader', function (data) {
  // console.log(data)
  switch (data.status) {
    case 'start':
      console.log('Flashing Bootloader.')
      uploadDone = false
      break
    case 'flashProgress':
      uploadDone = true
      flashBar.update(data.progress)
      break
    case 'uploadProgress':
      if (!uploadDone) {
        uploadBar.update(data.progress)
      } else {
        flashBar.update(data.progress)
      }
      break
    case 'success':
      console.log('Done\n')
      break
  }
})

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
upgradeBootloader.on('flashApplication', function (data) {
  // console.log(data)
  switch (data.status) {
    case 'start':
      console.log('Flashing Application')
      uploadDone = false
      break
    case 'flashProgress':
      uploadDone = true
      flashBar.update(data.progress)
      break
    case 'uploadProgress':
      if (!uploadDone) {
        uploadBar.update(data.progress)
      } else {
        flashBar.update(data.progress)
      }
      break
    case 'success':
      console.log('Done.\n')
      break
  }
})

function start (client) {
  // Figure out what block we are going to flash
  client.sendRequest(new Protocol.messages.GetAllBlocksRequest(), function (err, response) {
    if (err) {
      console.error(err)
      return
    }
    var blocks = []
    __.each(response.blocks, function (block) {
      blocks.push(new Block(block.blockId, block.hopCount, Block.blockTypeForId(block.blockTypeId)))
    })

    if (blocks.length > 1) {
      console.log('For testing purposes, please only attach a single block to be updated.')
    } else if (blocks.length === 0) {
      console.log('Please attach a block that you want to upgrade the bootloader and application.')
      process.exit()
    }

    var targetBlock = blocks[0]

    // Get config incase the block is in bootloader mode. Block type won't be known until then
    var request = new ImagoProtocol.Block.messages.GetConfigurationRequest(targetBlock.getBlockId())
    client.sendBlockRequest(request, function (err, response) {
      if (err) {
        console.log(err)
        process.exit()
      }
      if(Block.blockTypeForId(response.blockTypeId).name != "unknown")
      {
      	targetBlock._blockType = Block.blockTypeForId(response.blockTypeId)
      }

      console.log(response)

      targetBlock._mcuType = MCUTypes.PIC
      targetBlock.mode = response.mode

      console.log(targetBlock)

      // Get the pic bootloader+verification and application to flash
      var bootstrapHex = fs.readFileSync('./crc_upgrade/hex/boot_id_fix/' + targetBlock.getBlockType().name + '_bootstrap.hex')
      var applicationHex = fs.readFileSync('./upgrade/hex/application/' + targetBlock.getBlockType().name + '.hex')
      var deepMemoryBootloaderHex = fs.readFileSync('./crc_upgrade/hex/crc_update_bootloader/crc_update_bootloader.hex')

      // Kick-off the 3-stage flashing process
      upgradeBootloader.start(targetBlock, bootstrapHex, applicationHex, deepMemoryBootloaderHex)
    })
  })
}
