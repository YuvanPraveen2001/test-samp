var events = require('events')
var util = require('util')
var async = require('async')
var os = require('os')
var Block = require('../../block')
var BlockTypes = require('../../blockTypes')
var MCUTypes = require('../../mcuTypes')
var Version = require('../../version')
var emptyFunction = function () {}
var __ = require('underscore')
var crc = require('crc');
var isNode = require('detect-node');

var ValidTargetMCUTypes = [
  MCUTypes.PIC
]

function Flash(protocol, client) {
  events.EventEmitter.call(this)

  var self = this
  var messages = protocol.messages
  var steps = 1

  this.programToBlock = function (program, block, callback) {
    callback = callback || emptyFunction

    if (!block) {
      callback(new Error('Invalid block argument.'))
      return
    }

    if (!hasValidHopCount(block)) {
      callback(new Error('Invalid block hop count. Have you fetched the block yet?'))
      return
    }

    if (!hasValidTargetMCUType(block)) {
      callback(new Error('Invalid target MCU type: ' + block.getMCUType().typeId))
      return
    }

    if (!program.valid) {
      callback(new Error('Invalid program.'))
      return
    }

    var slot = {
      index: 0,
      blockTypeId: block.getBlockType().typeId,
      version: new Version(0, 0, 0),
      isCustom: false,
      crc: crc.crc8(program.data)
    }

    steps = 2
    self.programToSlot(program, slot, function (err) {
      if (err) {
        callback(err)
      } else {
        self.slotToBlock(slot.index, block.getBlockId(), function (err) {
          steps = 1
          callback(err)
        })
      }
    })
  }

  this.programToSlot = function (program, slot, callback) {
    var lineLength = 18
    var slotData = program.data
    var slotSize = Math.ceil(slotData.length / lineLength)
    var slotIndex = slot.index
    var blockTypeId = slot.blockTypeId
    var version = slot.version
    var isCustom = slot.isCustom
    var crc = slot.crc
    var request = new messages.UploadToMemoryRequest(slotIndex, slotSize, blockTypeId, version, isCustom, crc)
    var timeout = slotSize * 10000 // 1 second per line?

    var timer = setTimeout(function () {
      handleResult(new Error('Timed out waiting for upload to complete.'))
    }, timeout)

    client.on('event', waitForCompleteEvent)
    function waitForCompleteEvent(e) {
      if (e instanceof messages.UploadToMemoryCompleteEvent) {
        if(e.result == 0x00)//BT_SUCCESS
        {
          handleResult(null)
        }
        else{
          handleResult(new Error("Failed to validate hex CRC."))
        }
      }
    }

    client.sendRequest(request, function (err) {
      if (err) {
        handleResult(err)
      } else {
        //Obtain a write lock to prevent any other messages from being sent
        client.obtainWriteLock()

        var chunkSize = (client.getDevice().btType != 'le' && isNode && os.platform == 'darwin') ? slotData.length : 60;//slotData.length Switch to chunked for better progress updates.
        writeChunk(0)
        function writeChunk(i) {
          var start = i * chunkSize
          var end = start + chunkSize
          var chunk = slotData.slice(start, end)
          if (chunk.length > 0) {
            client.sendData(chunk, function (err) {
              if (err) {
                //Release the write lock
                client.releaseWriteLock()
                handleResult(err)
              } else {
                emitProgressEvent({
                  progress: start,
                  total: slotData.length,
                  action: 'upload',
                  step: getStep()
                })
                writeChunk(i + 1)
              }
            })
          } else {
            //Release the write lock
            client.releaseWriteLock()
            emitProgressEvent({
              progress: slotData.length,
              total: slotData.length,
              action: 'upload',
              step: getStep()
            })
          }
        }
      }
    }, 40000)

    function getStep() {
      return (steps === 2) ? [1,2] : [1,1]
    }

    function handleResult(err) {
      clearTimeout(timer)
      client.removeListener('event', waitForCompleteEvent)
      if (callback) {
        callback(err)
      }
    }
  }

  this.slotToBlock = function (slotIndex, blockId, callback) {
    callback = callback || emptyFunction

    var request = new messages.FlashMemoryToBlockRequest(blockId, slotIndex)
    var timeout = 15000
    var timer = setTimeout(onExpire, timeout)

    client.on('event', onProgressEvent)
    function onProgressEvent(e) {
      // When receiving a progress event, start a new timer.
      clearTimeout(timer)
      timer = setTimeout(onExpire, timeout)
    }

    client.on('response', onCompleteResponse)
    function onCompleteResponse(response) {
      if (messages.FlashMemoryToBlockResponse.code === response.code()) {
        clearTimeout(timer)
        client.removeListener('event', onProgressEvent)
        client.removeListener('response', onCompleteResponse)
        client.removeListener('event', onProgressEvent)
        if (response.result !== 0) {
          callback(new Error('Flashing failed.'))
        } else {
          // XXX(donald): Fake progress event.
          emitProgressEvent({
            progress: 100,
            total: 100,
            action: 'flash',
            step: getStep()
          })
          setTimeout(function () {
            callback(null)
          }, 50)
        }
      }
    }

    function getStep() {
      return (steps === 2) ? [2,2] : [1,1]
    }

    function onExpire() {
      client.removeListener('event', onProgressEvent)
      client.removeListener('response', onCompleteResponse)
      client.removeListener('event', onProgressEvent)
      callback(new Error('Timed out waiting for flash to complete.'))
    }

    // Note: The request queue is bypassed in flashing, because
    // more fine-grained control is needed over the timeout
    // for the response. For flashing, the timeout gets reset
    // each time a progress event is received.
    client.sendMessage(request)
    client.emit('request', request)

    // XXX(donald): Fake progress event.
    emitProgressEvent({
      progress: 0,
      total: 100,
      action: 'flash',
      step: getStep()
    })
  }

  function emitProgressEvent(e) {
    self.emit('progress', e)
  }
}

function hasValidTargetMCUType(block) {
  return __(ValidTargetMCUTypes).contains(block.getMCUType())
}

function hasValidHopCount(block) {
  return block.getHopCount() > 0
}

util.inherits(Flash, events.EventEmitter)

module.exports = Flash
