var Scanner = require('../scanner')
var util = require('util')
var xtend = require('xtend')
var debug = require('debug')('cubelets:scanner:nobleSerial')

var NobleScanner = function (opts) {
  Scanner.call(this)
  var scanner = this;
  scanner.state = "notReady";

  var noble;
  if(process.platform === "win32"){
    noble = require('noble-winrt');
  }
  else if(process.platform === "darwin"){
    noble = require('noble-mac');
  }
  else{
    noble = require('noble');
  }

  noble.on('stateChange', function(state) {
    if (state === 'poweredOn') {
      scanner.state = "ready";
      scanner.emit("ready");
    }
    else{
      scanner.state = "notReady";
    }
  });

  noble.on('scanStart', function(){
    debug("Scan started");
    scanner._scanning = true;
  });
  noble.on('scanStop', function(){
    debug("Scan stopped");
    scanner._scanning = false;
    noble.removeListener('discover', scanner.onDeviceDiscovered);
  });

  this._getDevices = function (callback) {
    var devices = [];
    callback(null, devices);
  }

  // Add a discovery method that can call a callback repeatedly with RSSi updates
  this._startScan = function(deviceAddedCallback, deviceUpdatedCallback, callback){

    var beginScan = function(){
      noble.startScanning([], true);
    }
    scanner.onDeviceDiscovered = function(peripheral){
      if(!peripheral || !peripheral.advertisement || !peripheral.advertisement.localName){
        return;
      }

      if(peripheral.advertisement.localName.toLowerCase().indexOf('cubelet') === 0)
      {
        peripheral.btType = 'le';
        peripheral.name = peripheral.advertisement.localName
        if(scanner._add(peripheral)){
          //New Device
          deviceAddedCallback(peripheral);
        }
        else{
          //Updated Device
          deviceUpdatedCallback(peripheral);
        }
      }
    };
    noble.on('discover', scanner.onDeviceDiscovered);

    if(scanner.state != "ready"){
      setTimeout(function(){
        if(scanner.state != "ready"){
          noble._state = "poweredOn";
          beginScan();
        }
      }, 300)
      scanner.once('ready', beginScan);
    }
    else if(scanner._scanning){
      scanner.stopDeviceScan(beginScan);
    }
    else{
      beginScan();
    }

  }
  //Override of Scanner
  this.startDeviceScan = function (deviceAddedCallback, deviceUpdatedCallback, callback) {
    scanner._startScan(deviceAddedCallback, deviceUpdatedCallback, callback);
  }
  this._stopScan = function(callback){
    noble.stopScanning();
    callback(null);
  }
  //Override of Scanner
  this.stopDeviceScan = function (callback) {
    this._stopScan(callback);
  }

  this._compareDevice = function (device, otherDevice) {
    return device.id == otherDevice.id
  }
}

util.inherits(NobleScanner, Scanner)

module.exports = new NobleScanner()
