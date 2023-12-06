var Scanner = require('../scanner')
var util = require('util')
var xtend = require('xtend')

var BTLE2Scanner = function (opts) {
  Scanner.call(this)
  var scanner = this;

  this._getDevices = function (callback) {
    callback(null, [])
  }

  // Add a discovery method that can call a callback repeatedly with RSSi updates
  this._startScan = function(deviceAddedCallback, deviceUpdatedCallback, callback){
    //Scanning Callbacks
    var beginScan = function(){
      ble.startScanWithOptions([], params, scanReturn, scanError);
    }
    var scanReturn = function(device){
      if(device.name && device.name.toLowerCase().indexOf('cubelet') === 0){
        device.btType = 'le';
        if(scanner._add(device)){
          //New Device
          deviceAddedCallback(device);
        }
        else{
          //Updated Device
          deviceUpdatedCallback(device);
        }
      }
    }

    var scanError = function(e){
      callback(e);
    }

    if(scanner._scanning){
      scanner.stopDeviceScan(beginScan);
    }
    else{
      beginScan();
    }

    var params = {
      reportDuplicates: true
    }
  }
  //Override of Scanner
  this.startDeviceScan = function (deviceAddedCallback, deviceUpdatedCallback, callback) {
    scanner._scanning = true
    scanner._startScan(deviceAddedCallback, deviceUpdatedCallback, callback);
  }
  this._stopScan = function(callback){
    ble.stopScan(function(){
      //Success Callback
      callback(null);
    }, function(e){
      //Error Callback
      callback(e);
    });
  }
  //Override of Sanner
  this.stopDeviceScan = function (callback) {
    scanner._scanning = false
    this._stopScan(callback);
  }

  this._compareDevice = function (device, otherDevice) {
    return device.address == otherDevice.address
  }
}

util.inherits(BTLE2Scanner, Scanner)

module.exports = new BTLE2Scanner()
