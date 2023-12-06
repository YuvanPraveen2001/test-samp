var debug = require('debug')('cubelets:serial')
var util = require('util')
var SerialPort = require('serialport')
var Scanner = require('../scanner')
var Connection = require('../connection')
var Client = require('../client')

var SerialScanner = function () {
  Scanner.call(this)

  this._getDevices = function (callback) {
    var sp = require('serialport')
    sp.list(function (err, ports) {
      var devices = []
      if (err) {
        callback(devices)
      } else {
        ports.forEach(function (port) {
          var comName = port.comName
          if (comName.indexOf('Cubelet') > -1) {
            devices.push({
              name: comName.match(/Cubelet-[A-Z][A-Z][A-Z]/g),
              path: comName,
              deviceId: comName
            })
          }
        })
        callback(devices)
      }
    })
  }

  this._compareDevice = function (device, otherDevice) {
    return device.path == otherDevice.path
  }
}

util.inherits(SerialScanner, Scanner)

var SerialConnection = function (device, opts) {
  Connection.call(this, device, opts)

  var path = device['path'] || ((process.platform === 'win32') ?
    'COM1' : '/dev/cu.Cubelet-RGB-AMP-SPP')

  var stream = this
  var serialPort = null
  var isOpen = false

  this._read = function (n) {
    // do nothing
  }

  this._write = function (data, enc, next) {
    var chunkSize = 60
    writeChunk(0)
    function writeChunk(i) {
      var start = i * chunkSize
      var end = start + chunkSize
      var chunk = data.slice(start, end)
      if (chunk.length > 0) {
        write(chunk, function (err) {
          if (err) {
            next(err)
          } else {
            writeChunk(i + 1)
          }
        })
      } else {
        next()
      }
    }
    function write(chunk, callback) {
      if (serialPort) {
        debug('<<', chunk)
        serialPort.write(chunk, function(){
          serialPort.drain(callback);
        })
      } else {
        callback(new Error('disconnected'))
      }
    }
  }

  this._open = function (callback) {
    if (serialPort) {
      if (callback) {
        callback(null)
      }
    } else {
      serialPort = new SerialPort(path, {autoOpen: false})

      serialPort.on('error', function (err) {
        stream.emit('error', err)
      })

      serialPort.open(function (err) {
        if (err) {
          if (callback) {
            callback(err)
          }
        } else {
          isOpen = true

          serialPort.on('data', function (chunk) {
            debug('>>', chunk)
            stream.push(chunk)
          })

          serialPort.on('close', function () {
            if (isOpen) {
              isOpen = false
              stream.close()
            }
          })

          if (callback) {
            callback(null)
          }
        }
      })
    }
  }

  this._close = function (callback) {
    if (!serialPort) {
      if (callback) {
        callback(null)
      }
    } else {
      var sp = serialPort
      serialPort = null
      sp.removeAllListeners('data')
      sp.removeAllListeners('close')
      sp.removeAllListeners('error')
      if (isOpen) {
        sp.close(cleanup)
      } else {
        cleanup()
      }
      function cleanup(err) {
        isOpen = false
        sp = null
        if (callback) {
          callback(err)
        }
      }
    }
  }
}

util.inherits(SerialConnection, Connection)

module.exports = Client(new SerialScanner(), SerialConnection)
