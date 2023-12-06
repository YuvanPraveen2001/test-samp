var BluetoothSerialPort = require('bluetooth-serial-port').BluetoothSerialPort
var Scanner = require('../scanner')
var util = require('util')
var xtend = require('xtend')

var BluetoothSerialScanner = function (opts) {
  Scanner.call(this)
  var self = this;

  var serialPort = new BluetoothSerialPort()

  this._getDevices = function (callback) {
    serialPort.listPairedDevices(function (pairedDevices) {
      var devices = []
      pairedDevices.forEach(function (pairedDevice) {
        var name = pairedDevice.name
        if (name.indexOf('Cubelet') === 0) {
          pairedDevice.btType = "classic"
          devices.push(xtend(pairedDevice, {
            deviceId: pairedDevice.address
          }))
        }
      })
      callback(devices)
    })
  }

  this._compareDevice = function (device, otherDevice) {
    return device.address == otherDevice.address
  }

  //Override of Scanner
  this.startDeviceScan = function (deviceAddedCallback, deviceUpdatedCallback, callback) {
    self._scanning = true
    self._startScan(deviceAddedCallback, deviceUpdatedCallback, callback);
  }

  this._startScan = function(deviceAddedCallback, deviceUpdatedCallback, callback){
    serialPort.on('found', function(address, name){
      var device = {
        name: name,
        address: address,
        btType: 'classic'
      }
      if(self._add(device)){
        //New Device
        deviceAddedCallback(device);
      }
      else{
        //Updated Device
        deviceUpdatedCallback(device);
      }
    })
    serialPort.on('finished', function () {
      self._scanning = false
      callback(null);
    });
    serialPort.inquire();//Expires after some point?
  }

  this._stopScan = function(callback){
    callback(new Error("Unable to stop scanning on this platform. Scanning will timeout."))
  }

  //Override of Scanner
  this.stopDeviceScan = function (callback) {
    self._scanning = false
    self._stopScan(callback);
  }
}

util.inherits(BluetoothSerialScanner, Scanner)

module.exports = new BluetoothSerialScanner()
