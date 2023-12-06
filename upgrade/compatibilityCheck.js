var util = require('util')
var events = require('events')
var cubelets = require('../index')()
var Block = cubelets.Block
var BlockTypes = cubelets.BlockTypes
var MCUTypes = cubelets.MCUTypes
var InfoService = cubelets.InfoService
var __ = require('underscore')

function CompatibilityCheck(client) {
  var self = this
  events.EventEmitter.call(self)

  var unknownBlocks = []
  var compatibleBlocks = []
  var notCompatibleBlocks = []
  var fetchTimer = null
  var fetchInterval = 4000

  this.getCompatibleBlocks = function () {
    return compatibleBlocks
  }

  this.getNotCompatibleBlocks = function () {
    return notCompatibleBlocks
  }

  this.getCheckedBlocks = function () {
    return [].concat(compatibleBlocks, notCompatibleBlocks)
  }

  this.start = function (callback) {
    if (fetchTimer) {
      callback(null)
    } else {
      client.fetchAllBlocks(function (err, blocks) {
        if (err) {
          callback(err)
        } else {
          unknownBlocks = filterUnknownBlocks(blocks)
          fetchUnknownBlockTypes(function (err) {
            if (err) {
              callback(err)
              self.emit('error', err)
            } else {
              if (unknownBlocks.length > 0) {
                self.emit('found', unknownBlocks)
                checkUnknownBlocks()
              }
              callback(null)
              fetchTimer = setInterval(
                fetchMoreBlocks,
                fetchInterval
              )
            }
          })
        }
      })
    }
  }

  function fetchMoreBlocks() {
    client.fetchNeighborBlocks(function (err, blocks) {
      unknownBlocks = filterUnknownBlocks(blocks)
      fetchUnknownBlockTypes(function (err) {
        if (err) {
          self.emit('error', err)
        } else {
          if (unknownBlocks.length > 0) {
            self.emit('found', unknownBlocks)
            checkUnknownBlocks()
          }
        }
      })
    })
  }

  this.finish = function () {
    if (fetchTimer) {
      clearTimeout(fetchTimer)
      fetchTimer = null
    }
  }

  function filterUnknownBlocks(blocks) {
    return __(blocks).chain()
      .filter(function (block) {
        return block.getBlockType() === BlockTypes.UNKNOWN
      })
      .difference(compatibleBlocks.concat(notCompatibleBlocks))
      .value()
  }

  function fetchUnknownBlockTypes(callback) {
    var service = new InfoService()

    service.on('info', function (info, block) {
      block._blockType = Block.blockTypeForId(info.blockTypeId)
      block._mcuType = Block.mcuTypeForId(info.mcuTypeId)
    })

    service.fetchBlockInfo(unknownBlocks, function (err) {
      service.removeAllListeners('info')
      callback(err)
    })
  }

  function checkUnknownBlocks() {
    __(unknownBlocks).each(function (block) {
      var mcuType = block.getMCUType()
      if (mcuType === MCUTypes.AVR) {
        notCompatibleBlocks.push(block)
        self.emit('notCompatible', block)
      } else if (mcuType === MCUTypes.PIC) {
        compatibleBlocks.push(block)
        self.emit('compatible', block)
      }
    })
    unknownBlocks = filterUnknownBlocks()
  }
}

util.inherits(CompatibilityCheck, events.EventEmitter)

module.exports = CompatibilityCheck
