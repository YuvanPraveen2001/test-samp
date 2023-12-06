var args = process.argv
if (args.length < 3) {
  console.log('Usage: node bin/upgrade PATH {{DEFAULT_COLOR}}')
  process.exit(1)
}

var async = require('async')
var prompt = require('cli-prompt')
var cubelets = require('../index')()
var Block = require('../block')
var BlockTypes = require('../blockTypes')
var Upgrade = require('../upgrade')
var CompatibilityCheck = require('../upgrade/compatibilityCheck')
var InfoService = cubelets.InfoService
var __ = require('underscore')
var clc = require('cli-color')
var UpdateService = require('../services/update')

//Service for marking a block as upgraded
var updateService = new UpdateService()

// Console output colors
var error = clc.bgRed.white.bold
var success = clc.bgGreen.white.bold

if (args.length === 3) {
  // Default color of the terminal window
  defaultColor = '\x1b[37;40m'
} else {
  var defaultColor = args[3]
}

var device = {
  path: args[2]
}

var client = cubelets.connect(device, function (err) {
  if (err) {
    exitWithError(err)
  } else {
    console.log('Connected. Starting upgrade...')
    start(client)
  }
})

client.on('disconnect', function () {
  console.log('Disconnected.')
})

function start (client) {
  var upgrade = new Upgrade(client)

  upgrade.detectIfNeeded(function (err, needsUpgrade, firmwareType) {
    if (err) {
      exitWithError(err)
    } else if (needsUpgrade) {
        runUpgrade()
    } else {
      client.fetchConfiguration(function (err, configuration) {
        if (err) {
          exitWithError(err)
        } else {
          runUpgrade()
          //var version = configuration.applicationVersion
          //exitWithSuccess('Already upgraded to OS4. (v' + version.toString() + ')')
        }
      })
    }
  })

  function runCompatibilityCheck () {
    var check = new CompatibilityCheck(client)
    prompt('Attach all of your Cubelets. Then press ENTER.\n', function () {
      console.log('Please wait about 5 seconds for Cubelet Kit discovery...')
      check.on('found', function (blocks) {
        console.log('Found', formatNumber(blocks.length), 'block(s). Checking compatibility...')
      })
      check.on('notCompatible', function (block) {
        console.log('𐄂', 'Block', formatBlockName(block), 'is NOT compatible.')
      })
      check.on('compatible', function (block) {
        console.log('✓', 'Block', formatBlockName(block), 'is compatible.')
      })
      check.start(function (err) {
        console.log('Checked', formatNumber(check.getCheckedBlocks().length), 'block(s).')
        prompt([
          'Attach more Cubelets directly to the Bluetooth block,',
          'or press ENTER to finish the check.\n'
        ].join('\n'), function enter () {
          check.finish()
          var compatible = check.getCompatibleBlocks().length
          var notCompatible = check.getNotCompatibleBlocks().length
          if (compatible === 0) {
            console.log([
              'It looks like none of your Cubelets are compatible with OS4.',
              'Visit modrobotics.com/sustainability to learn about our Cubelet upgrade recycling program.'
            ].join('\n'))
            exitWithSuccess('Upgrade canceled.')
          } else if (notCompatible > 0) {
            askYesOrNo([
              'It looks like ' + formatNumber(notCompatible) + ' of your Cubelets are compatible with OS4.',
              'Do you want to continue the upgrade?'
            ].join('\n'), function yes () {
              runUpgrade()
            }, function no () {
              exitWithSuccess('Upgrade canceled. Goodbye.')
            })
          } else {
            askYesOrNo([
              'All of your Cubelets are compatible with OS4!',
              'Ready to upgrade your Cubelets?'
            ].join('\n'), function yes () {
              runUpgrade()
            }, function no () {
              exitWithSuccess('Upgrade canceled. Goodbye.')
            })
          }
        })
      })
    })
  }

  function runUpgrade () {
    upgrade.on('progress', function (e) {
      console.log(
        e.action ? e.action : '',
        Math.floor(100.0 * e.progress / Math.max(1, e.total)) + '%'
      )
    })
    upgrade.on('flashBootstrapToHostBlock', function (hostBlock) {
      console.log('Flashing Cubelets OS4 bootstrap firmware to the Bluetooth block...')
    })
    upgrade.on('needToDisconnect', function () {
      console.log('To continue the upgrade, reset power on your Cubelets by switching the Battery Cubelet off then on.')
    })
    upgrade.on('needToConnect', function () {
      console.log('Attempting to reconnect to Cubelets...')
      setTimeout(tryReconnect, 5000)
    })
    function tryReconnect () {
      async.retry({ times: 5, interval: 5000 }, function (callback) {
        client.connect(device, callback)
      }, function (err) {
        if (err) {
          exitWithError(new Error('Could not reconnect.'))
        }
      })
    }
    upgrade.on('flashBootstrapToTargetBlock', function (block) {
      console.log('Flashing Cubelets OS4 bootstrap firmware to block', formatBlockName(block) + '...')
    })
    upgrade.on('flashUpgradeToTargetBlock', function (block) {
      console.log('Flashing Cubelets OS4 firmware to block', formatBlockName(block) + '...')
    })
    upgrade.on('completeTargetBlock', function (block) {
      printSuccessMessage('Successfully upgraded block ' + formatBlockName(block) + ' to OS4.')
      updateService.setBlockUpdated(block.getBlockId(), true);
    })
    upgrade.on('changePendingBlocks', function (pendingBlocks) {
      console.log('There are', formatNumber(pendingBlocks.length), 'pending blocks to upgrade.')
    })
    upgrade.on('changeTargetBlock', function (targetBlock) {
      if (targetBlock) {
        console.log('Target block is', formatBlockName(targetBlock) + '.')
      }
    })
    upgrade.on('flashUpgradeToHostBlock', function (hostBlock) {
      console.log('Flashing Cubelets OS4 firmware to the Bluetooth block...')
    })
    upgrade.on('completeHostBlock', function (hostBlock) {
      console.log('Successfully upgraded Bluetooth block.')
    })
    upgrade.on('error', function onError (err) {
      console.error('Upgrade failed:\n\t', err)
      askYesOrNo('Retry?', function yes () {
        process.nextTick(runUpgrade)
      }, function no () {
        exitWithError(err)
      })
    })
    upgrade.on('start', function () {
      prompt([
        'Attach more Cubelets directly to the Bluetooth block,',
        'or press ENTER if you are done upgrading all of your Cubelets.\n'
      ].join('\n'), function () {
        upgrade.finish()
      })
    })
    upgrade.start(function (err) {
      if (err) {
        exitWithError(err)
      } else {
        exitWithSuccess('Cubelets OS4 updgrade complete.')
      }
    })
  }
}

function askYesOrNo (text, yesCallback, noCallback) {
  prompt(text + ' [Y/n] ', function (val) {
    (val.toLowerCase() === 'y' ?
      yesCallback : noCallback)()
  })
}

function formatNumber (n) {
  if (n === 0) return '0'
  else if (n === 1) return 'one'
  else if (n === 2) return 'two'
  else if (n === 3) return 'three'
  else if (n === 4) return 'four'
  else return n
}

function formatBlockName (block) {
  return block.getBlockType().name + ' (' + block.getBlockId() + ')'
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

function exitWithSuccess (msg) {
  console.log(msg)
  process.exit(0)
}
