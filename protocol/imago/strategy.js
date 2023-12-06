var debug = require('debug')('cubelets:imago')
var util = require('util')
var Strategy = require('../strategy')
var Version = require('../../version')
var Block = require('../../block')
var BlockMap = require('../../blockMap')
var BlockTypes = require('../../blockTypes')
var async = require('async')
var __ = require('underscore')

function ImagoStrategy(protocol, client) {
  Strategy.call(this, protocol, client)

  var messages = protocol.messages

  this.ping = function (callback, timeout) {
    client.echo(new Buffer(0), callback, timeout)
  }

  this.echo = function (data, callback, timeout) {
    client.sendRequest(new messages.EchoRequest(data), callback)
  }

  var map = new BlockMap()

  map.on('update', function () {
    client.emit('updateBlockMap')
  })

  this.getBlockMap = function () {
    return map
  }

  this.resetBlockMap = function()
  {
  	map = new BlockMap()
  }

  var configuration = null

  this.getConfiguration = function () {
    return configuration
  }

  this.fetchConfiguration = function (callback) {
    debug('fetch configuration')
    async.seq(
      client.sendRequest,
      onFetchConfiguration
    )(new messages.GetConfigurationRequest(), callback)
  }

  function onFetchConfiguration(response, callback) {
    var blockId = response.blockId
    configuration = response
    map.setOriginBlock(blockId, (client.getDevice().btType == "le") ? BlockTypes.BLE_HAT : BlockTypes.BLUETOOTH)
    if (callback) {
      callback(null, configuration)
    }
  }

  this.fetchOriginBlock = function (callback) {
    debug('fetch origin block')
    client.fetchConfiguration(function (err) {
      if (callback) {
        callback(err, map.getOriginBlock())
      }
    })
  }

  this.fetchNeighborBlocks = function (callback) {
    debug('fetch neighbor blocks')
    async.seq(
      client.sendRequest,
      onFetchNeighborBlocks
    )(new messages.GetNeighborBlocksRequest(), callback)
  }

  function onFetchNeighborBlocks(response, callback) {
    var origin = map.getOriginBlock()
    if (origin) {
      map.upsert({
        blockId: origin.getBlockId(),
        neighbors: response.neighbors
      })
    }
    __(response.neighbors).each(function (blockId, faceIndex) {
      map.upsert({
        blockId: blockId,
        hopCount: 1,
        faceIndex: parseInt(faceIndex, 10)
      })
    })
    if (callback) {
      callback(null, map.getNeighborBlocks())
    }
  }

  this.fetchAllBlocks = function (callback) {
    debug('fetch all blocks')
    async.seq(
      client.sendRequest,
      onFetchAllBlocks
    )(new messages.GetAllBlocksRequest(), callback)
  }

  function onFetchAllBlocks(response, callback) {
    response.blocks.forEach(function (block) {
      map.upsert({
        blockId: block.blockId,
        hopCount: block.hopCount,
        blockType: Block.blockTypeForId(block.blockTypeId)
      })
    })
    if (callback) {
      callback(null, map.getAllBlocks())
    }
  }

  this.fetchGraph = function (callback) {
    debug('fetch graph')
    async.series([
      client.fetchOriginBlock,
      client.fetchNeighborBlocks,
      client.fetchAllBlocks,
      fetchAllBlockNeighbors
    ], function (err) {
      if (callback) {
        if (err) {
          callback(err)
        } else {
          callback(null, map.getGraph())
        }
      }
    })
  }

  function sortBlocksByHopCount(unsortedBlocks) {
    return __(unsortedBlocks).sortBy(function (block) {
      return typeof block.hopCount === 'number' ? block.hopCount : 255
    })
  }

  function filterUnknownBlocks(blocks) {
    return __(blocks).filter(function (block) {
      return BlockTypes.UNKNOWN !== block.getBlockType()
    })
  }

  function fetchAllBlockTypes(callback) {
    client.fetchBlockTypes(map.getAllBlocks(), callback)
  }

  this.fetchBlockTypes = function (unsortedBlocks, callback) {
    client.fetchBlockConfigurations(filterUnknownBlocks(unsortedBlocks), callback)
  }

  function fetchAllBlockConfigurations(callback) {
    client.fetchBlockConfigurations(map.getAllBlocks(), callback)
  }

  this.fetchBlockConfigurations = function (unsortedBlocks, callback) {
    var fetchTasks = []
    __(sortBlocksByHopCount(unsortedBlocks)).each(function (block) {
      fetchTasks.push(function (callback) {
        var blockId = block.getBlockId()
        var GetConfigurationRequest = protocol.Block.messages.GetConfigurationRequest
        client.sendBlockRequest(new GetConfigurationRequest(blockId), function (err, response) {
          if (err) {
            if (callback) {
              callback(err)
            }
          } else {
            map.upsert({
              blockId: blockId,
              blockType: Block.blockTypeForId(response.blockTypeId),
              hardwareVersion: response.hardwareVersion,
              bootloaderVersion: response.bootloaderVersion,
              applicationVersion: response.applicationVersion,
              customApplication: response.customApplication,
              mode: response.mode
            })
            if (callback) {
              callback(null, unsortedBlocks)
            }
          }
        })
      })
    })
    async.series(fetchTasks, callback)
  }

  function fetchAllBlockNeighbors(callback) {
    client.fetchBlockNeighbors(map.getAllBlocks(), function(err, blocks){
      if(err){
        callback(null, [])
      }
      else{
        callback(null, blocks)
      }
    })
  }

  this.fetchBlockNeighbors = function (unsortedBlocks, callback) {
    var fetchTasks = []
    __(sortBlocksByHopCount(unsortedBlocks)).each(function (block) {
      fetchTasks.push(function (callback) {
        var blockId = block.getBlockId()
        var GetNeighborsRequest = protocol.Block.messages.GetNeighborsRequest
        client.sendBlockRequest(new GetNeighborsRequest(blockId), function (err, response) {
          if (err) {
            if (callback) {
              callback(err)
            }
          } else {
            map.upsert({
              blockId: blockId,
              neighbors: response.neighbors
            })
            if (callback) {
              callback(null, unsortedBlocks)
            }
          }
        })
      })
    })
    async.series(fetchTasks, callback)
  }

  this.setBlockValue = function (blockId, value) {
    var block = map.findById(blockId)
    if (block) {
      block._value = value
      block._valueOverridden = true
      client.sendCommand(new messages.SetBlockValueCommand([{
        blockId: blockId,
        value: value
      }]))
    } else {
      client.emit('error', new Error('Block not found.'))
    }
  }

  this.setManyBlockValues = function (blockValueMap) {
    var blocks = __(blockValueMap).reduce(function (blocks, blockId, value) {
      var block = map.findById(blockId)
      if (block) {
        block._value = value
        blocks.push({
          blockId: blockId,
          value: value
        })
      } else {
        client.emit('error', new Error('Block not found.'))
      }
    }, [])
    if (blocks.length > 0) {
      client.sendCommand(new messages.SetBlockValueCommand(blocks))
    }
  }

  this.clearBlockValue = function (blockId) {
    var block = map.findById(blockId)
    if (block) {
      block._valueOverridden = false
      client.sendCommand(new messages.ClearBlockValueCommand([{
        blockId: blockId
      }]))
    } else {
      client.emit('error', new Error('Block not found.'))
    }
  }

  this.clearManyBlockValues = function (blocks, callback) {
    var blocks = __(blockValueMap).reduce(function (blocks, blockId, value) {
      var block = map.findById(blockId)
      if (block) {
        block._valueOverridden = value
        blocks.push({
          blockId: blockId
        })
      } else {
        client.emit('error', new Error('Block not found.'))
      }
    }, [])
    if (blocks.length > 0) {
      client.sendCommand(new messages.ClearBlockValueCommand(blocks))
    }
  }

  this.clearAllBlockValues = function (callback) {
    var blocks = __(map.getBlocks()).filter(function (block) {
      return block.isValueOverridden()
    })
    if (blocks.length > 0) {
      client.clearManyBlockValues(blocks, callback)
    }
  }

  this.registerBlockValueEvent = function (blockId, callback) {
    client.sendRequest(new messages.RegisterBlockValueEventRequest(blockId), callback)
  }

  this.unregisterBlockValueEvent = function (blockId, callback) {
    client.sendRequest(new messages.UnregisterBlockValueEventRequest(blockId), callback)
  }

  this.unregisterAllBlockValueEvents = function (callback) {
    client.sendRequest(new messages.UnregisterAllBlockValueEventsRequest(), callback)
  }

  this.sendBlockRequest = function (blockRequest, callback, timeout) {
    var writeBlockRequest = new messages.WriteBlockMessageRequest(blockRequest)

    timeout = timeout || client._defaultTimeout

    var timer = setTimeout(function () {
      client.removeListener('event', waitForBlockResponse)
      if (callback) {
        var code = blockRequest.code()
        var err = new Error('Timed out waiting for block response to block request: ' + code)
        err.friendlyMessage = 'A Cubelet in the map is not responding. It may need to be reattached.'
        err.code = code
        callback(err)
      }
    }, timeout)

    function waitForBlockResponse(e) {
      if (e.code() === messages.ReadBlockMessageEvent.code) {
        var blockResponse = e.blockMessage
        if (protocol.Block.requestCodeForResponseCode(blockResponse.code()) === blockRequest.code() && blockResponse.blockId === blockRequest.blockId) {
          clearTimeout(timer)
          client.removeListener('event', waitForBlockResponse)
          if (callback) {
            callback(null, blockResponse)
          }
        }
      }
    }

    function onRequestError(err) {
      clearTimeout(timer)
      client.removeListener('event', waitForBlockResponse)
      if (callback) {
        callback(err)
      }
    }

    client.on('event', waitForBlockResponse)
    client.sendRequest(writeBlockRequest, function (err, response) {
      if (err) {
        onRequestError(err)
      } else if (response.result !== 0) {
        onRequestError(new Error('Failed to write block message with result: ' + response.result))
      }
    })
  }

  this.setConnectionInteral = function(min, max, connectionLatency, supervisorTimeout, callback){
    if (!callback && !supervisorTimeout){
      callback = connectionLatency
    }
    connectionLatency = connectionLatency || 0
    supervisorTimeout = supervisorTimeout || 600

    var req = new messages.SetConnectionIntervalRequest(min, max, connectionLatency, supervisorTimeout)
    client.sendRequest(req, function (err, res) {
      if(err || res.status != 0){
        debug("Failed to set connection interval", err, res)
        return
      }
      debug("Successfully set connection interval")
      callback(err)
    }, 200);
  }

  this.handleEvent = function (e) {
    if (e instanceof messages.BlockRemovedEvent) {
      debug('block removed', e.blockId)
      map.remove(e.blockId)
    }
    if (e instanceof messages.BlockAddedEvent) {
      debug('block added', e.blockId, 'type', e.blockTypeId)
      var block = map.upsert({
        blockId: e.blockId,
        hopCount: e.hopCount,
        blockType: Block.blockTypeForId(e.blockTypeId)
      })
      if (block) {
        client.fetchBlockNeighbors([ block ])
      }
    }
  }
}

util.inherits(ImagoStrategy, Strategy)
module.exports = ImagoStrategy
