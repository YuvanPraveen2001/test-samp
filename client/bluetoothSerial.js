var debug = require('debug')('cubelets:bluetoothSerial')
var util = require('util')
var BluetoothSerialPort = require('bluetooth-serial-port').BluetoothSerialPort
var Connection = require('../connection')
var Client = require('../client')
var xtend = require('xtend')
var scanner = require('../scanner/bluetoothSerial')

var BluetoothSerialConnection = function (device, opts) {
  Connection.call(this, device, opts)

  var address = device['address'] || '00:00:00:00:00:00'
  var services = device['services']
  var channelID = services.find(function(e){return e.name == 'AMP-SPP' || e.name == 'SPP'}).channel || 1

  var stream = this
  var serialPort = null
  var isOpen = false

  this._read = function (n) {
    // do nothing
  }

  this._write = function (chunk, enc, next) {
    if (serialPort) {
      debug('<<', chunk)
      serialPort.write(chunk, next)
    }
  }

  this._open = function (callback) {
    if (serialPort) {
      if (callback) {
        callback(null)
      }
    } else {
      serialPort = new BluetoothSerialPort()

      serialPort.on('error', function (err) {
        stream.emit('error', err)
      })

      serialPort.connect(address, channelID, function (err) {
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

          serialPort.once('closed', function () {
            isOpen = false
            stream.close()
          })

          serialPort.once('failure', function () {
            isOpen = false
            stream.close()
          })

          if (callback) {
            callback(null)
          }
        }
      }, function(){
      	callback(new Error("Failed to connect."))
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
      sp.removeAllListeners('closed')
      sp.removeAllListeners('failure')
      sp.removeAllListeners('error')
      if (isOpen) {
        sp.once('closed', cleanup)
        sp.close()
      } else {
        cleanup()
      }
      function cleanup() {
        isOpen = false
        sp = null
        if (callback) {
          callback(null)
        }
      }
    }
  }
}

util.inherits(BluetoothSerialConnection, Connection)

module.exports = Client(scanner, BluetoothSerialConnection)
