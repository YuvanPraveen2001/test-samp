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
var HexFiles = require('./hexFiles')
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

  var running = false
  var finished = false
  var hostBlock = null
  var targetFaces = {}
  var pendingBlocks = []
  var completedBlocks = []
  var targetBlock = null

  this.getClient = function () {
    return client
  }

  this.detectIfNeeded = function (callback) {
    callback = callback || emptyFunction
    setTimeout(function () {
      callback(null, true, FirmwareTypes.CLASSIC)
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
      setTimeout(function () {
        async.series([
          flashBootstrapToHostBlock,
          startBlockUpgrades,
          flashUpgradeToHostBlock
        ], onFinish)
      }, 500)
      function onFinish(err) {
        finished = true
        running = false
        self.emit('finish')
        callback(null)
      }
    }
  }

  this.finish = function () {
    if (running) {
      finished = true
    }
  }

  function flashBootstrapToHostBlock(callback) {
    debug('flashBootstrapToHostBlock')
    self.emit('flashBootstrapToHostBlock', hostBlock)
    var i = 0
    var timer = setInterval(function () {
      ++i
      if (i <= 100) {
        self.emit('progress', {
          progress: i,
          total: 100,
          step: [0,1]
        })
      } else {
        clearInterval(timer)
        setTimeout(function () {
          self.emit('needToDisconnect')
          setTimeout(function () {
            self.emit('needToConnect')
            setTimeout(function () {
              callback(null)
            }, 2000)
          }, 2000)
        }, 500)
      }
    }, 10)
  }

  this.getPendingBlocks = function () {
    return pendingBlocks
  }

  this.getTargetBlock = function () {
    return targetBlock
  }

  this.getCompletedBlocks = function () {
    return completedBlocks
  }

  function getRandomBlock() {
    var blockId = Math.floor(Math.random() * 100)
    var randomBlockTypes = [
      BlockTypes.BATTERY,
      BlockTypes.INVERSE,
      BlockTypes.PASSIVE,
      BlockTypes.DISTANCE,
      BlockTypes.DRIVE
    ]
    var blockType = randomBlockTypes[Math.floor(Math.random() * randomBlockTypes.length)]
    var block = new Block(blockId, 1, blockType)
    block._mcuType = MCUTypes.PIC
    return block
  }

  function startBlockUpgrades(callback) {
    debug('startBlockUpgrades')
    self.emit('startBlockUpgrades')
    async.until(function () {
      return finished
    }, function (next) {
      pendingBlocks = []
      __(Math.floor(6 * Math.random())).times(function () {
        pendingBlocks.push(getRandomBlock())
      })
      self.emit('changePendingBlocks', pendingBlocks)
      if (pendingBlocks.length > 0) {
        var i = 0
        setTimeout(function () {
          targetBlock = pendingBlocks.shift()
          self.emit('changeTargetBlock', targetBlock)
          self.emit('changePendingBlocks', pendingBlocks)
          var timer = setInterval(function () {
            ++i
            if (i <= 100) {
              self.emit('progress', {
                progress: i,
                total: 100,
                step: [0,1]
              })
            } else {
              clearInterval(timer)
              setTimeout(function () {
                completedBlocks.push(targetBlock)
                targetBlock = null
                self.emit('changeCompletedBlocks', completedBlocks)
                self.emit('changeTargetBlock', targetBlock)
                next(null)
              }, 10)
            }
          }, 10)
        }, 500)
      } else {
        setTimeout(function () {
          next(null)
        }, 5000)
      }
    }, callback)
  }

  function flashUpgradeToHostBlock(callback) {
    debug('flashUpgradeToHostBlock')
    self.emit('flashUpgradeToHostBlock', hostBlock)
    var i = 0
    var timer = setInterval(function () {
      ++i
      if (i <= 100) {
        self.emit('progress', {
          progress: i,
          total: 100,
          step: [0,1]
        })
      } else {
        clearInterval(timer)
        callback(null)
      }
    }, 10)
  }
}

util.inherits(Upgrade, events.EventEmitter)
module.exports = Upgrade
module.exports.FirmwareTypes = FirmwareTypes
