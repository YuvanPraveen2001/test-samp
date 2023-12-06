var Scanner = require('../scanner')
var util = require('util')
var xtend = require('xtend')
var bluetooth = cordova.require('com.modrobotics.bluetooth.index')

var BluetoothScanner = function () {
  Scanner.call(this)

  this._getDevices = function (callback) {
    var result = []
    bluetooth.getDevices(function (err, devices) {
      if (err) {
        callback(result)
      } else {
        devices.forEach(function (device) {
          var name = device.name
          var deviceId = device.deviceId
          if (name.indexOf('Cubelet') === 0) {
            result.push({
              deviceId: deviceId,
              name: name,
              btType: 'classic'
            })
          }
        })
        callback(result)
      }
    })
  }

  this._compareDevice = function (device, otherDevice) {
    return device.deviceId == otherDevice.deviceId
  }
}

util.inherits(BluetoothScanner, Scanner)

module.exports = new BluetoothScanner()
