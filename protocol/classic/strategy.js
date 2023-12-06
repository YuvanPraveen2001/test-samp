var async = require('async')
var util = require('util')
var Strategy = require('../strategy')
var Block = require('../../block')
var BlockMap = require('../../blockMap')
var BlockTypes = require('../../blockTypes')
var __ = require('underscore')

function ClassicStrategy(protocol, client) {
  Strategy.call(this, protocol, client)

  var messages = protocol.messages

  this.ping = function (callback, timeout) {
    client.sendRequest(new messages.KeepAliveRequest(), callback, timeout)
  }

  var map = new BlockMap()

  map.on('update', function () {
    client.emit('updateBlockMap')
  })

  this.getBlockMap = function () {
    return map
  }

  this.fetchOriginBlock = function (callback) {
    if (map.getOriginBlock()) {
      if (callback) {
        callback(null)
      }
    } else {
      client.fetchNeighborBlocks(function (err) {
        if (callback) {
          callback(err, map.getOriginBlock())
        }
      })
    }
  }

  this.fetchNeighborBlocks = function (callback) {
    async.seq(
      client.sendRequest,
      onFetchNeighborBlocks
    )(new messages.GetNeighborBlocksRequest(), callback)
  }

  function onFetchNeighborBlocks(response, callback) {
    var originBlockId = response.originBlockId
    if (originBlockId) {
      map.setOriginBlock(originBlockId, BlockTypes.BLUETOOTH)
      map.upsert({
        blockId: originBlockId,
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
    client.sendCommand(new messages.DiscoverAllBlocksCommand())
    setTimeout(function () {
      // Wait for command to "diffuse" through the construction,
      // which causes blocks to report their id. Then, request
      // the blocks.
      client.sendRequest(new messages.GetAllBlocksRequest(), function (err, response) {
        if (err) {
          if (callback) {
            callback(err)
          }
        } else {
          response.blocks.forEach(function (block) {
            map.upsert({
              blockId: block.blockId,
              hopCount: block.hopCount
            })
          })
          if (callback) {
            callback(null, map.getAllBlocks())
          }
        }
      })
    }, 5000)
  }

  this.setBlockValue = function (blockId, value) {
    var block = map.findById(blockId)
    if (block) {
      block._value = value
      block._valueOverridden = true
      client.sendCommand(new messages.SetBlockValueCommand(blockId, value))
    } else {
      client.emit('error', new Error('Block not found.'))
    }
  }

  this.clearBlockValue = function (blockId) {
    var block = map.findById(blockId)
    if (block) {
      block._valueOverridden = false
      client.sendCommand(new messages.ClearBlockValueCommand(blockId))
    } else {
      client.emit('error', new Error('Block not found.'))
    }
  }

  this.registerBlockValueEvent = function (blockId) {
    client.sendCommand(new messages.RegisterBlockValueEventRequest(blockId))
    if (callback) {
      callback(null)
    }
  }

  this.unregisterBlockValueEvent = function (blockId, callback) {
    client.sendCommand(new messages.UnregisterBlockValueEventRequest(blockId))
    if (callback) {
      callback(null)
    }
  }

  this.unregisterAllBlockValueEvents = function (callback) {
    client.sendCommand(new messages.UnregisterAllBlockValueEventsRequest())
    if (callback) {
      callback(null)
    }
  }
}

util.inherits(ClassicStrategy, Strategy)
module.exports = ClassicStrategy
