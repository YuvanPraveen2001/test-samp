var debug = require('debug')('cubelets:upgrade')
var assert = require('assert')
var util = require('util')
var events = require('events')
var async = require('async')
var ClassicProtocol = require('../protocol/classic')
var ClassicProgram = ClassicProtocol.Program
var ClassicFlash = ClassicProtocol.Flash
var ImagoProtocol = require('../protocol/imago')
var ImagoProgram = ImagoProtocol.Program
var ImagoFlash = ImagoProtocol.Flash
var BootstrapProtocol = require('../protocol/bootstrap')
var cubelets = require('../index')()
var Block = cubelets.Block
var BlockTypes = cubelets.BlockTypes
var MCUTypes = cubelets.MCUTypes
var InfoService = cubelets.InfoService
var ImagoFirmwareService = cubelets.ImagoFirmwareService
var HexFiles = require('./hexFiles')
var DefaultVersions = require('./defaultHardwareVersions')
var Version = require('../version')
var emptyFunction = function () {}
var __ = require('underscore')

var FirmwareTypes = {
  CLASSIC: 0,
  IMAGO: 1,
  BOOTSTRAP: 2
}

var Upgrade = function (client) {
  var self = this
  events.EventEmitter.call(this)

	var firmwareService = new ImagoFirmwareService()

  var running = false
  var finished = false
  var hostBlock = null
  var targetFaces = {}
  var pendingBlocks = []
  var completedBlocks = []
  var targetBlock = null
  var step = [0,1]
  var skipReadyCommand = false
  var skipNotCompatibleBlock = false

  this.getClient = function () {
    return client
  }

  this.detectIfNeeded = function (callback) {
    callback = callback || emptyFunction
    detectFirmwareType(function (err, firmwareType) {
      if (err) {
        callback(err)
      } else {
        callback(null, (FirmwareTypes.IMAGO !== firmwareType), firmwareType)
      }
    })
  }

  function detectFirmwareType(callback) {
    // Switch to the classic protocol
    client.setProtocol(ClassicProtocol)
    // Send a keep alive request to test how the cubelet responds
    client.sendRequest(new ClassicProtocol.messages.KeepAliveRequest(), function (err, response) {
      if (err) {
        // The imago protocol will fail to respond.
        client.setProtocol(ImagoProtocol)
        // Get configuration to detect if this is imago running in bootstrap.
        client.sendRequest(new ImagoProtocol.messages.GetConfigurationRequest(), function (err, response) {
          if (err) {
            callback(err)
          } else if (response.mode === 2) {
            // Bootstrap mode detected. Force a jump to discovery mode.
            jumpToDiscovery(function (err) {
              callback(err, FirmwareTypes.BOOTSTRAP)
            })
          } else {
            // This is actually imago firmware.
            setHostBlock(response.blockId)
            callback(null, FirmwareTypes.IMAGO)
          }
        })
      } else if (response.payload.length > 0) {
        // The bootstrap protocol will differentiate itself by
        // sending an extra byte in the response.
        client.setProtocol(BootstrapProtocol)
        callback(null, FirmwareTypes.BOOTSTRAP)
      } else {
        // Otherwise, the cubelet has classic firmware.
        callback(null, FirmwareTypes.CLASSIC)
      }
    }, 500)
  }

  this.start = function (callback) {
    callback = callback || emptyFunction
    if (running) {
      callback(new Error('Upgrade already started.'))
    } else {
      running = true
      finished = false
      self.emit('start')
      detectFirmwareType(function (err, firmwareType) {
        if (err) {
          callback(err)
          self.emit('error', err)
        } else if (FirmwareTypes.CLASSIC === firmwareType) {
          async.series([
            jumpToClassic,
            discoverHostBlock,
            flashBootstrapToHostBlock,
            startBlockUpgrades,
            jumpToDiscovery,
            jumpToClassic,
            flashUpgradeToHostBlock
          ], onFinish)
        } else if (FirmwareTypes.BOOTSTRAP === firmwareType) {
          async.series([
            startBlockUpgrades,
            jumpToDiscovery,
            jumpToClassic,
            discoverHostBlock,
            flashUpgradeToHostBlock
          ], onFinish)
        } else if (FirmwareTypes.IMAGO === firmwareType) {
          skipReadyCommand = true
          async.series([
            jumpToImagoBootloader,
            flashBootstrapToHostBlock,
            startBlockUpgrades,
            jumpToDiscovery,
            jumpToClassic,
            flashUpgradeToHostBlock
          ], onFinish)
        } else {
          async.series([
            function(callback)
            {
            	client.setProtocol(ImagoProtocol)
            	var req = new ImagoProtocol.messages.SetModeRequest(0)
			        client.sendRequest(req, function (err, res) {
			        }, 200)
              setTimeout(function()
			        {
			        	client.setProtocol(ClassicProtocol)
			        	hostBlock = new Block(99, 0, BlockTypes.BLUETOOTH)
          			hostBlock._mcuType = MCUTypes.AVR
          			shouldSkipReady = true
			        	callback(null)
			        }, 1000)
            },
            flashBootstrapToHostBlock,
            startBlockUpgrades,
            jumpToDiscovery,
            jumpToClassic,
            flashUpgradeToHostBlock
          ], onFinish)
        }
      })
      function onFinish(err) {
        finished = true
        running = false
        if (err) {
          self.emit('error', err)
          callback(err)
        } else {
          self.emit('finish')
          callback(null)
        }
      }
    }
  }

  this.finish = function () {
    if (running) {
      finished = true
    }
  }

  function setHostBlock(originBlockId) {
    hostBlock = new Block(originBlockId, 0, BlockTypes.BLUETOOTH)
    hostBlock._mcuType = MCUTypes.AVR
  }

  function discoverHostBlock(callback) {
    debug('discoverHostBlock')
    assert.equal(client.getProtocol(), ClassicProtocol, 'Must be in OS3 mode.')
    var req = new ClassicProtocol.messages.GetNeighborBlocksRequest()
    client.sendRequest(req, function (err, res) {
      if (err) {
        callback(err)
      } else {
        var originBlockId = res.originBlockId
        if (originBlockId > 0) {
          setHostBlock(originBlockId)
          callback(null)
        } else {
          callback(new Error('Host block not found.'))
        }
      }
    })
  }

  function emitProgressEvent(e) {
    var x = step[0]
    var n = step[1]
    if (e.step) {
      x += e.step[0]
    }
    if (n > 0) {
      self.emit('progress', {
        progress: e.progress,
        total: e.total,
        action: e.action,
        step: [x,n]
      })
    } else {
      self.emit('progress', e)
    }
  }

  function setNextStep(nextStep) {
    return function (callback) {
      step = nextStep
      callback(null)
    }
  }

  function flashBootstrapToHostBlock(callback) {
    step = [0,1]
    debug('flashBootstrapToHostBlock')
    assert.equal(client.getProtocol(), ClassicProtocol, 'Must be in OS3 mode.')

    hostBlock._hardwareVersion = new Version(2, 1, 0)
    firmwareService.fetchBootstrapFirmware(hostBlock, function(err, res)
    {
    	var program = new ClassicProgram(res.hexBlob)
	    if (program.valid) {
	      self.emit('flashBootstrapToHostBlock', hostBlock)
	      var flash = new ClassicFlash(client, {
	        skipSafeCheck: true,
	        skipReadyCommand: skipReadyCommand
	      })
	      flash.programToBlock(program, hostBlock, function (err) {
	        flash.removeListener('progress', onProgress)
	        if (err) {
	          callback(err)
	        } else {
	          client.setProtocol(BootstrapProtocol)
	          detectReset(callback)
	        }
	      })
	      flash.on('progress', onProgress)
	      function onProgress(e) {
	        emitProgressEvent(e)
	      }
	    } else {
	      callback(new Error('Program invalid.'))
	    }
    })

  }

  function detectReset(callback) {
    debug('detectReset')
    self.emit('detectReset')
    client.on('disconnect', onDisconnect)
    function onDisconnect() {
      client.removeListener('disconnect', onDisconnect)
      client.removeListener('event', onEvent)
      client.on('connect', onConnect)
      self.emit('needToConnect')
      function onConnect() {
        client.removeListener('connect', onConnect)
        callback(null)
      }
    }
    client.on('event', onEvent)
    function onEvent(e) {
      if (e instanceof BootstrapProtocol.messages.SkipDisconnectEvent) {
        client.removeListener('disconnect', onDisconnect)
        client.removeListener('event', onEvent)
        callback(null)
      } else if (e instanceof BootstrapProtocol.messages.DisconnectFailedEvent) {
        self.emit('needToDisconnect')
      }
    }
  }

  this.getPendingBlocks = function () {
    return pendingBlocks
  }

  function enqueuePendingBlock(block) {
    debug('enqueuePendingBlock')
    if (!findPendingBlockById(block.getBlockId())) {
      pendingBlocks.unshift(block)
      self.emit('changePendingBlocks', pendingBlocks)
      return true
    } else {
      return false
    }
  }

  function dequeuePendingBlock() {
    debug('dequeuePendingBlock')
    var index = __(pendingBlocks).findIndex(function (block) {
      return block.getBlockType() !== BlockTypes.UNKNOWN
    })
    if (index > -1) {
      var nextBlock = pendingBlocks[index]
      pendingBlocks.splice(index, 1)
      self.emit('changePendingBlocks', pendingBlocks)
      return nextBlock
    }
  }

  this.getTargetBlock = function () {
    return targetBlock
  }

  function setTargetBlock(block) {
    debug('setTargetBlock')
    targetBlock = block
    self.emit('changeTargetBlock', targetBlock)
  }

  this.getCompletedBlocks = function () {
    return completedBlocks
  }

  function enqueueCompletedBlock(block) {
    debug('enqueueCompletedBlock')
    if (!findCompletedBlockById(block.getBlockId())) {
      completedBlocks.unshift(block)
      self.emit('completeTargetBlock', block)
      self.emit('changeCompletedBlocks', completedBlocks)
      return true
    } else {
      return false
    }
  }

  function startBlockUpgrades(callback) {
    debug('startBlockUpgrades')
    self.emit('startBlockUpgrades')
    async.until(function () {
      return finished
    }, function (next) {
      async.series([
        jumpToDiscovery,
        retry(3, discoverTargetFaces),
        wait(2500)
      ], next)
    }, callback)
  }

  function jumpToClassic(callback) {
    debug('jumpToClassic')
    var protocol = client.getProtocol()
    if (ClassicProtocol === protocol) {
      callback(null)
    } else if (BootstrapProtocol === protocol) {
      var req = new BootstrapProtocol.messages.SetBootstrapModeRequest(0)
      client.sendRequest(req, function (err, res) {
        if (err) {
          callback(err)
        } else if (res.mode !== 0) {
          callback(new Error('Failed to jump to OS3 mode.'))
        } else {
          client.setProtocol(ClassicProtocol)
          setTimeout(function () {
            callback(null)
          }, 500)
        }
      })
    } else {
      callback(new Error('Must not jump to OS3 mode from OS4 mode.'))
    }
  }

  function jumpToImago(callback) {
    debug('jumpToImago')
    var protocol = client.getProtocol()
    if (ImagoProtocol === protocol) {
      callback(null)
    } else if (BootstrapProtocol === protocol) {
      var req = new BootstrapProtocol.messages.SetBootstrapModeRequest(1)
      client.sendRequest(req, function (err, res) {
        if (err) {
          callback(err)
        } else if (res.mode !== 1) {
          callback(new Error('Failed to jump to OS4 mode.'))
        } else {
          client.setProtocol(ImagoProtocol)
          setTimeout(function () {
            callback(null)
          }, 500)
        }
      })
    } else {
      callback(new Error('Must not jump to OS4 mode from OS3 mode.'))
    }
  }

  function jumpToImagoBootloader(callback) {
    debug('jumpToImagoBootloader')
    var protocol = client.getProtocol()
    if (ImagoProtocol === protocol) {
      var req = new ImagoProtocol.messages.SetModeRequest(0)
      client.sendRequest(req)
      client.setProtocol(ClassicProtocol)
      setTimeout(function () {
        callback(null)
      }, 2000)
    } else {
      callback(new Error('Must only jump to OS4 bootloader from OS4 mode.'))
    }
  }

  function jumpToDiscovery(callback) {
    debug('jumpToDiscovery')
    var protocol = client.getProtocol()
    if (BootstrapProtocol === protocol) {
      callback(null)
    } else {
      var ResetCommand = protocol.messages.ResetCommand
      client.sendCommand(new ResetCommand())
      client.setProtocol(BootstrapProtocol)
      setTimeout(function () {
        callback(null)
      }, 500)
    }
  }

  function discoverTargetFaces(callback) {
    debug('discoverTargetFaces')
    assert.equal(client.getProtocol(), BootstrapProtocol, 'Must be in discovery mode.')
    targetFaces = {}
    client.on('event', onBlockFoundEvent)
    function onBlockFoundEvent(e) {
      if (e instanceof BootstrapProtocol.messages.BlockFoundEvent) {
        var faceIndex = e.faceIndex
        var firmwareType = e.firmwareType
        targetFaces[faceIndex] = {
          faceIndex: faceIndex,
          firmwareType: firmwareType,
          timestamp: __.now()
        }
      }
    }
    pendingBlocks = []
    setTimeout(function () {
      client.removeListener('event', onBlockFoundEvent)
      debug('faces', targetFaces)
      var classicFaces = __(targetFaces).where({ firmwareType: 0 })
      var imagoFaces = __(targetFaces).where({ firmwareType: 1 })
      if (classicFaces.length > 0) {
        debug('has os3 faces')
        async.series([
          jumpToClassic,
          wait(1000),
          enqueuePendingClassicBlocks,
          fetchUnknownPendingBlockTypes,
          upgradeNextPendingClassicBlock
        ], callback)
      } else if (imagoFaces.length > 0) {
        debug('has os4 faces only')
        async.series([
          jumpToImago,
          wait(1000),
          enqueuePendingImagoBlocks,
          fetchUnknownPendingBlockTypes,
          upgradeNextPendingImagoBlock
        ], callback)
      } else {
        debug('no faces')
        callback(null)
      }
    }, 2500)
  }

  function enqueuePendingClassicBlocks(callback) {
    debug('enqueuePendingClassicBlocks')
    assert.equal(client.getProtocol(), ClassicProtocol, 'Must be in OS3 mode.')
    var req = new ClassicProtocol.messages.GetNeighborBlocksRequest()
    client.sendRequest(req, function (err, res) {
      if (err) {
        callback(err)
      } else {
        __(res.neighbors).each(function (blockId, faceIndex) {
          var block = new Block(blockId, 1, BlockTypes.UNKNOWN)
          block._faceIndex = parseInt(faceIndex, 10)
          enqueuePendingBlock(block)
        })
        callback(null)
      }
    })
  }

  function upgradeNextPendingClassicBlock(callback) {
    debug('upgradeNextPendingClassicBlock')
    assert.equal(client.getProtocol(), ClassicProtocol, 'Must be in OS3 mode.')
    var nextBlock = dequeuePendingBlock()
    if (nextBlock) {
      setTargetBlock(nextBlock)
      if (MCUTypes.PIC === nextBlock.getMCUType()) {
        async.series([
          setNextStep([0,4]),
          flashBootstrapToTargetBlock,
          jumpToDiscovery,
          discoverTargetImagoBlock,
          jumpToImago,
          setNextStep([2,4]),
          flashUpgradeToTargetBlock,
          checkTargetBlockComplete
        ], callback)
      } else {
        skipNotCompatibleBlock = false
        self.emit('notCompatible', nextBlock)
        async.until(function () {
          return skipNotCompatibleBlock
        }, wait(250), callback)
      }
    } else {
      setTargetBlock(null)
      callback(null)
    }
  }

  this.skipNotCompatibleBlock = function () {
    setTargetBlock(null)
    skipNotCompatibleBlock = true
  }

  function enqueuePendingImagoBlocks(callback) {
    debug('enqueuePendingImagoBlocks')
    var protocol = client.getProtocol()
    assert.equal(protocol, ImagoProtocol, 'Must be in OS4 mode.')
    var req = new ImagoProtocol.messages.GetNeighborBlocksRequest()
    client.sendRequest(req, function (err, res) {
      if (err) {
        callback(err)
      } else {
        var getModeTasks = __(res.neighbors).map(function (blockId, faceIndex) {
          return function (callback) {
            var req = new ImagoProtocol.Block.messages.GetConfigurationRequest(blockId)
            client.sendBlockRequest(req, function (err, res) {
              if (err) {
                // Note: This is a non-fatal error, so send a successful
                // result back to the callback so the upgrade process can
                // continue. However, still emit the error so it can still
                // be noticed by the app.
                callback(null)
              } else {
                // Only enqueue pending imago blocks if they are in bootloader.
                if (res.mode === 0 && !findPendingBlockById(blockId)) {
                  var block = new Block(blockId, 1, BlockTypes.UNKNOWN)
                  block._faceIndex = parseInt(faceIndex, 10)
                  enqueuePendingBlock(block)
                }
                callback(null)
              }
            })
          }
        })
        async.series(getModeTasks, callback)
      }
    })
  }

  function upgradeNextPendingImagoBlock(callback) {
    debug('upgradeNextPendingImagoBlock')
    assert.equal(client.getProtocol(), ImagoProtocol, 'Must be in OS4 mode.')
    var nextBlock = dequeuePendingBlock()
    if (nextBlock) {
      setTargetBlock(nextBlock)
      async.series([
        setNextStep([0,2]),
        flashUpgradeToTargetBlock,
        checkTargetBlockComplete
      ], callback)
    } else {
      setTargetBlock(null)
      callback(null)
    }
  }

  function fetchUnknownPendingBlockTypes(callback) {
    debug('fetchUnknownPendingBlockTypes')
    var unknownBlocks = filterUnknownPendingBlocks()
    if (0 === unknownBlocks.length) {
      callback(null)
    } else {
      var service = new InfoService()

      service.on('info', function (info, block) {
        block._blockType = Block.blockTypeForId(info.blockTypeId)
        block._mcuType = Block.mcuTypeForId(info.mcuTypeId)
      })

      service.fetchBlockInfo(unknownBlocks, function (err) {
        service.removeAllListeners('info')
        self.emit('changePendingBlocks', pendingBlocks)
        callback(err)
      })
    }
  }

  function flashBootstrapToTargetBlock(callback) {
    debug('flashBootstrapToTargetBlock')
    assert.equal(client.getProtocol(), ClassicProtocol, 'Must be in OS3 mode.')
    assert(targetBlock, 'Target block must be set.')
    var blockType = targetBlock.getBlockType()
    targetBlock._hardwareVersion = new Version(	DefaultVersions[blockType.name].major,
    																						DefaultVersions[blockType.name].minor,
    																						DefaultVersions[blockType.name].patch)
    firmwareService.fetchBootstrapFirmware(targetBlock, function(err, res)
    {
    	var program = new ClassicProgram(res.hexBlob)
	    if (program.valid) {
	      self.emit('flashBootstrapToTargetBlock', targetBlock)
	      var flash = new ClassicFlash(client, {
	        skipSafeCheck: true
	      })
	      flash.programToBlock(program, targetBlock, function (err) {
	        flash.removeListener('progress', onProgress)
	        callback(err)
	        if (err) {
	          setTargetBlock(null)
	          if (isFatalError(err)) {
	            self.emit('error', err)
	          }
	        }
	      })
	      flash.on('progress', onProgress)
	      function onProgress(e) {
	        emitProgressEvent(e)
	      }
	    } else {
	      callback(new Error('Program invalid.'))
	    }
  	})
  }

  function discoverTargetImagoBlock(callback) {
    debug('discoverTargetImagoBlock')
    assert.equal(client.getProtocol(), BootstrapProtocol, 'Must be in discovery mode.')
    assert(targetBlock, 'Target block must be set.')
    var timer = setTimeout(function () {
      client.removeListener('event', onBlockFoundEvent)
      setTargetBlock(null)
      callback(new Error('Failed to discover target OS4 block.'))
    }, 5000)
    client.on('event', onBlockFoundEvent)
    function onBlockFoundEvent(e) {
      if (e instanceof BootstrapProtocol.messages.BlockFoundEvent) {
        if (e.firmwareType === 1 && e.faceIndex === targetBlock.getFaceIndex()) {
          clearTimeout(timer)
          client.removeListener('event', onBlockFoundEvent)
          callback(null)
        }
      }
    }
  }

  function flashUpgradeToTargetBlock(callback) {
    debug('flashUpgradeToTargetBlock')
    assert.equal(client.getProtocol(), ImagoProtocol, 'Must be in OS4 mode.')
    assert(targetBlock, 'Target block must be set.')
    var blockType = targetBlock.getBlockType()

    targetBlock._hardwareVersion = new Version(	DefaultVersions[blockType.name].major,
    																						DefaultVersions[blockType.name].minor,
    																						DefaultVersions[blockType.name].patch)

    targetBlock._bootloaderVersion = new Version(0,0,0);

    firmwareService.checkForBootloaderUpdate(targetBlock, function(err, res)
    {
    	if(err)
    	{
    		callback(err)
    		return
    	}
  	 	var program = new ImagoProgram(res.applicationHexBlob)
	    if (program.valid) {
	      self.emit('flashUpgradeToTargetBlock', targetBlock)
	      var flash = new ImagoFlash(client, {
	        skipSafeCheck: true
	      })
	      flash.programToBlock(program, targetBlock, function (err) {
	        flash.removeListener('progress', onProgress)
	        callback(err)
	        if (err) {
	          setTargetBlock(null)
	        }
	      })
	      flash.on('progress', onProgress)
	      function onProgress(e) {
	        emitProgressEvent(e)
	      }
	    } else {
	      callback(new Error('Program invalid.'))
	    }
    });
  }

  function checkTargetBlockComplete(callback) {
    debug('checkTargetBlockComplete')
    assert(targetBlock, 'Target block must be set.')
    enqueueCompletedBlock(targetBlock)
    setTargetBlock(null)
    callback(null)
  }

  function flashUpgradeToHostBlock(callback) {
    step = [0,1]
    debug('flashUpgradeToHostBlock')
    assert.equal(client.getProtocol(), ClassicProtocol, 'Must be in OS3 mode.')

    hostBlock._bootloaderVersion = new Version(4, 1, 0);
    hostBlock._hardwareVersion = new Version(2, 1, 0);
    firmwareService.fetchLatestHex(hostBlock, function(err, res)
    {
    	var program = new ClassicProgram(res.hexBlob)
	    if (program.valid) {
	      self.emit('flashUpgradeToHostBlock', hostBlock)
	      var flash = new ClassicFlash(client, {
	        skipSafeCheck: true
	      })
	      flash.programToBlock(program, hostBlock, function (err) {
	        flash.removeListener('progress', onProgress)
	        if (err) {
	          callback(err)
	        } else {
	          client.setProtocol(ImagoProtocol)
	          self.emit('completeHostBlock', hostBlock)
	          callback(null)
	        }
	      })
	      flash.on('progress', onProgress)
	      function onProgress(e) {
	        emitProgressEvent(e)
	      }
	    } else {
	      callback(new Error('Program invalid.'))
	    }
    })
  }

  function wait(timeout) {
    return function (callback) {
      debug('waiting...')
      setTimeout(callback, timeout)
    }
  }

  function retry(times, fun) {
    return function (callback) {
      async.retry({ times: times, interval: 500 }, fun, callback)
    }
  }

  function isFatalError(err) {
    return err && (
      ('?' === err.code) ||
      ('Y' === err.code)
    )
  }

  function findPendingBlockById(blockId) {
    return __(pendingBlocks).find(function (pendingBlock) {
      return blockId === pendingBlock.getBlockId()
    })
  }

  function findCompletedBlockById(blockId) {
    return __(completedBlocks).find(function (completedBlock) {
      return blockId === completedBlock.getBlockId()
    })
  }

  function filterUnknownPendingBlocks() {
    return __(pendingBlocks).filter(function (block) {
      return block.getBlockType() === BlockTypes.UNKNOWN
    })
  }
}

util.inherits(Upgrade, events.EventEmitter)
module.exports = Upgrade
module.exports.FirmwareTypes = FirmwareTypes
