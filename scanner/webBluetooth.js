var Scanner = require('../scanner')
var util = require('util')
var xtend = require('xtend')
var debug = require('debug')('cubelets:scanner:webBluetooth')

//Nordic UART UUIDs
var SERVICE_UUID =  '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
var RELIABLE_SERVICE_UUID =  '6e400004-5a3f-393e-0a9e-50e24dcca9e0';
var DFU_SERVICE_UUID = '00060000-f8ce-11e4-abf4-0002a5d5c51b';

var WebBluetoothScanner = function (opts) {
  Scanner.call(this)
  var scanner = this;

  //This method is expected to return paired devices. There will be no
  //paired devices for WebBluetooth
  this._getDevices = function (callback) {
    callback(null, [])
  }

  // Add a discovery method that can call a callback repeatedly with RSSi updates
  this._startScan = function(deviceAddedCallback, deviceUpdatedCallback, callback){
    //Scanning Callbacks
    var beginScan = function(){
      var options = {
        filters: [{
          namePrefix: 'Cubelet',
        }],
        optionalServices:[SERVICE_UUID, RELIABLE_SERVICE_UUID, DFU_SERVICE_UUID]
      };
      //"Scanning: only ever going to return one device"
      navigator.bluetooth.requestDevice(options)
      .then(device => {
        device.btType = 'le';
        deviceAddedCallback(device);
        deviceUpdatedCallback(device);
      })
      .then(() => {
        callback(null);
      }).catch(function(error) {
        callback(error)
      });
    }

    beginScan();
  }
  //Override of Scanner
  this.startDeviceScan = function (deviceAddedCallback, deviceUpdatedCallback, callback) {
    scanner._scanning = true
    scanner._startScan(deviceAddedCallback, deviceUpdatedCallback, callback);
  }

  this._stopScan = function(callback){
    debug("StopDeviceScan not implemented for this client.")
  }
  //Override of Scanner
  this.stopDeviceScan = function (callback) {
    scanner._scanning = false
    this._stopScan(callback);
  }
}

util.inherits(WebBluetoothScanner, Scanner)

module.exports = new WebBluetoothScanner()
