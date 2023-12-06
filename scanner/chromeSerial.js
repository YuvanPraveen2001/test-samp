var Scanner = require('../scanner')
var util = require('util')
var xtend = require('xtend')

var SPP_UUID = "00001101-0000-1000-8000-00805f9b34fb"

var ChromeSerialScanner = function (opts) {
  Scanner.call(this)
  var scanner = this;

  this._getDevices = function (callback) {
    var devices = [];
    chrome.bluetooth.getDevices(function(pairedDevices){
      pairedDevices.forEach(function (pairedDevice){
        if(pairedDevice.name && pairedDevice.name.indexOf('Cubelet') >= 0){
          pairedDevice.btType = scanner._deviceType(pairedDevice)
          devices.push(pairedDevice);
        }
      })
      callback(devices);
    });
  }

  this._compareDevice = function (device, otherDevice) {
    return device.address == otherDevice.address
  }

  this._deviceType = function(device){
    if(device.uuids.includes(SPP_UUID)){
      return 'classic';
    }
    return 'le';
  }
}

util.inherits(ChromeSerialScanner, Scanner)

module.exports = new ChromeSerialScanner()
