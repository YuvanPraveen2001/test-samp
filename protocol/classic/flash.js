var debug = require('debug')('cubelets:flash')
var events = require('events')
var util = require('util')
var async = require('async')
var Block = require('../../block')
var BlockTypes = require('../../blockTypes')
var MCUTypes = require('../../mcuTypes')
var Version = require('../../version')
var emptyFunction = function () {}
var __ = require('underscore')

var ValidTargetMCUTypes = [
  MCUTypes.AVR,
  MCUTypes.PIC
]

function Flash(protocol, client, opts) {
  events.EventEmitter.call(this)

  var self = this
  var messages = protocol.messages
  var Encoder = protocol.Message.Encoder
  var stream = client.getConnection()
  var parser = client.getParser()
  opts = opts || {}

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

    var capabilities = {
      'reset': block.getApplicationVersion().isGreaterThanOrEqual(new Version(3,1,0))
    }

    if (!program.valid) {
      callback(new Error('Invalid program.'))
      return
    }

    function friendlyMessageForErrorCode(code) {
      switch (code) {
        case '?': return 'Bluetooth Cubelet could not initialize flashing and may need to be reset.'
        case '4': return 'Target Cubelet is not ready to be flashed. Try flashing again in a moment. The target may need to be reset.'
        case 'Y': return 'Program upload to Bluetooth Cubelet failed. Make sure connection is still active and try again.'
        case 'Z': return 'Could not communicate with target Cubelet after flashing. The target may need to be reset.'
        default:
          return 'Reason unknown.'
      }
    }

    // Waits for a given code
    function waitForCode(code, timeout) {
      return function (callback) {
        // Listen to raw data from parser
        parser.setRawMode(true)
        parser.on('raw', waitForRaw)

        // Set a timeout for receiving the data
        var timer = setTimeout(function () {
          parser.removeListener('raw', waitForRaw)
          var error = new Error("Timed out waiting for '" + code + "'.")
          error.friendlyMessage = friendlyMessageForErrorCode(code)
          error.code = code
          callback(error)
        }, timeout)

        function waitForRaw(data) {
          // Check first byte of raw data
          if (data.readUInt8(0) === code.charCodeAt(0)) {
            parser.removeListener('raw', waitForRaw)
            clearTimeout(timer)
            callback(null)
          }
        }
      }
    }

    // Sends data and drains the buffer
    function send(data) {
      return function (callback) {
        process.nextTick(function () {
          stream.write(data, function (error) {
            if (error) {
              callback(error)
            } else {
              drain(callback)
            }
          })
        })
      }
    }

    // Sends a single-character code
    function sendCode(code) {
      return send(new Buffer([code.charCodeAt(0)]))
    }

    // Drains the buffer
    function drain(callback) {
      if (typeof stream.drain === 'function') {
        stream.drain(callback)
      } else {
        callback(null)
      }
    }

    // Waits for a given interval
    function wait(interval) {
      return function (callback) {
        setTimeout(function () {
          callback(null)
        }, interval)
      }
    }

    function sendResetCommand(timeout) {
      return function (callback) {
        async.series([
          parallelize([
            send(new Buffer([
              0x15,
              0x3A,
              0x95,
              0x68,
              0xC1,
              0x9A,
              0x84
            ])),
            waitForCode('?', timeout)
          ]),
          send(new Buffer([
            0x59
          ]))
        ], callback)
      }
    }

    function sendDisableAutoMapUpdatesCommand(callback) {
      sendCode('5')(callback)
    }

    parser.setRawMode(true)

    // Branch flashing sequence for host block,
    // otherwise use the target flashing sequence.
    if (isBlockHost(block)) {
      flashHostBlock()
    } else {
      flashTargetBlock()
    }

    // Flashes a target block, attached to a host block.
    function flashTargetBlock() {
      function sendReadyCommand(timeout) {
        return function (callback) {
          parallelize([
            sendCode('3'),
            waitForCode('4', timeout)
          ])(callback)
        }
      }
      function sendProgramChecksum(timeout) {
        return function (callback) {
          parallelize([
            send(new Buffer([
              '8'.charCodeAt(0),
              program.checksum.xor,
              program.checksum.sum
            ])),
            waitForCode('R', timeout)
          ])(callback)
        }
      }
      function sendProgramData(timeout) {
        return function(callback) {
          async.series((function () {
            var series = []
            var interval = 80
            var size = 200
            var p = 0
            function progress(p) {
              return function (callback) {
                emitProgressEvent({
                  step: [1,2],
                  progress: p,
                  total: program.data.length,
                  action: 'upload'
                })
                callback(null)
              }
            }
            var data
            while (data = program.readData(size)) {
              (function (data) {
                if (program.hasDataAvailable()) {
                  series.push(send(data))
                  series.push(progress(p += data.length))
                  series.push(wait(interval))
                }
                else {
                  series.push(parallelize([
                    send(data),
                    waitForCode('Y', timeout)
                  ]))
                  series.push(progress(program.data.length))
                }
              })(data)
            }
            return series
          })(), callback)
        }
      }
      function sendFlashCommand(timeout) {
        return function (callback) {
          switch (block.getMCUType().typeId) {
            case MCUTypes.AVR.typeId:
              var encodedId = Encoder.encodeId(block.getBlockId())
              async.series([
                parallelize([
                  send(new Buffer([
                    'W'.charCodeAt(0),
                    encodedId.readUInt8(0),
                    encodedId.readUInt8(1),
                    encodedId.readUInt8(2)
                  ])),
                  waitForCode('R', timeout)
                ]),
                send(new Buffer([
                  'M'.charCodeAt(0),
                  encodedId.readUInt8(0),
                  encodedId.readUInt8(1),
                  encodedId.readUInt8(2),
                  program.pageCount,
                  program.lastPageSize
                ])),
                waitForFlash(timeout)
              ], callback)
              break
            case MCUTypes.PIC.typeId:
              var encodedId = Encoder.encodeId(block.getBlockId())
              async.series([
                send(new Buffer([
                  'L'.charCodeAt(0),
                  encodedId.readUInt8(0),
                  encodedId.readUInt8(1),
                  encodedId.readUInt8(2)
                ])),
                waitForFlash(timeout)
              ], callback)
              break
            default:
              callback(new Error("Flashing MCU type '" + block.getMCUType().typeId + "' is not supported."))
              break
          }
        }
      }
      // Waits for flashing to complete
      function waitForFlash(timeout) {
        return function (callback) {
          // Listen to response from parser
          parser.setRawMode(false)
          parser.on('message', waitForEvent)

          // Timeout expiration handler
          function onExpire() {
            parser.removeListener('message', waitForEvent)
            callback(new Error('Timed out waiting for flash to complete.'))
          }

          // Set a timeout for receiving response
          var timer = setTimeout(onExpire, timeout)

          function waitForEvent(e) {
            switch (e.code()) {
              case messages.FlashProgressEvent.code:
                clearTimeout(timer)
                emitProgressEvent({
                  step: [2,2],
                  progress: 20 * e.progress,
                  total: program.lineCount,
                  action: 'flash'
                })
                timer = setTimeout(onExpire, timeout)
                break
              case messages.FlashCompleteEvent.code:
                parser.removeListener('message', waitForEvent)
                clearTimeout(timer)
                emitProgressEvent({
                  step: [2,2],
                  progress: program.lineCount,
                  total: program.lineCount,
                  action: 'flash'
                })
                callback(null)
                break
            }
          }
        }
      }
      function sendSafeCheck(timeout) {
        return parallelize([
          sendCode('1'),
          waitForCode('Z', timeout)
        ])
      }
      async.series([
        drain
      ].concat(capabilities['reset'] ? [
        sendResetCommand(10000),
        wait(1000),
        drain
      ]:[]).concat(opts.disableAutoMapUpdates ? [
        sendDisableAutoMapUpdatesCommand
      ]:[]).concat([
        sendReadyCommand(10000),
        sendProgramChecksum(10000),
        sendProgramData(10000),
        wait(2000),
        sendFlashCommand(10000)
      ]).concat(opts.skipSafeCheck ? []:[
        wait(1000),
        sendSafeCheck(10000)
      ].concat(capabilities['reset'] ? [
        wait(1000),
        sendResetCommand(10000)
      ]:[])), function (error) {
        parser.setRawMode(false)
        handleResult(error)
      })
    }

    // Flashes the origin, or "host" block, e.g. bluetooth
    function flashHostBlock() {
      function sendReadyCommand(timeout) {
        return function (callback) {
          var encodedId = Encoder.encodeId(block.getBlockId())
          parallelize([
            send(new Buffer([
              'T'.charCodeAt(0),
              encodedId.readUInt8(0),
              encodedId.readUInt8(1),
              encodedId.readUInt8(2)
            ])),
            waitForCode('!', timeout)
          ])(callback)
        }
      }
      function sendProgramPages(timeout) {
        return function (callback) {
          async.series((function() {
            var series = []
            var pages = program.getPages()
            var p = 0
            function progress(p) {
              return function (callback) {
                emitProgressEvent({
                  step: [1,1],
                  progress: p,
                  total: pages.length,
                  action: 'flash'
                })
                callback(null)
              }
            }
            series.push(progress(0))
            pages.forEach(function (page) {
              series.push(parallelize([
                send(page),
                waitForCode('G', timeout)
              ]))
              series.push(progress(p += 1))
            })
            series.push(sendJumpCommand(10000))
            return series
          })(), callback)
        }
      }
      function sendJumpCommand(timeout) {
        return parallelize([
          send(new Buffer([ 0xFE, 0xFD ])),
          waitForCode('@', timeout)
        ])
      }
      function sendSafeCheck(timeout) {
        return parallelize([
          sendCode('#'),
          waitForCode('%', timeout)
        ])
      }
      async.series([
        drain
      ].concat(opts.disableAutoMapUpdates ? [
        sendDisableAutoMapUpdatesCommand,
      ]:[]).concat(
        opts.skipReadyCommand ? []:[
        sendReadyCommand(10000)
      ]).concat([
        sendProgramPages(10000)
      ]).concat(opts.skipSafeCheck ? []:[
        wait(1000),
        sendSafeCheck(10000)
      ].concat(capabilities['reset'] ? [
        wait(1000),
        sendResetCommand(10000)
      ]:[])), function (error) {
        debug('flash complete')
        parser.setRawMode(false)
        handleResult(error)
      })
    }

    function emitProgressEvent(e) {
      self.emit('progress', e)
    }

    function handleResult(error) {
      if (error) {
        debug('flash error')
        self.emit('error', error)
        callback(error)
      } else {
        debug('flash success')
        self.emit('success')
        callback(null)
      }
    }
  }
}

function parallelize(tasks) {
  return function (callback) {
    async.parallel(tasks, callback)
  }
}

function hasValidTargetMCUType(block) {
  return __(ValidTargetMCUTypes).contains(block.getMCUType())
}

function hasValidHopCount(block) {
  return typeof block.getHopCount() === 'number'
}

function isBlockHost(block) {
  return block.getHopCount() === 0
}

util.inherits(Flash, events.EventEmitter)

module.exports = Flash
