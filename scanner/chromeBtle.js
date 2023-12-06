var Scanner = require('../scanner')
var util = require('util')
var xtend = require('xtend')
var SPP_UUID = "00001101-0000-1000-8000-00805f9b34fb"
var ChromeBtleScanner = function (opts) {
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

  // Add a discovery method that can call a callback repeatedly with RSSi updates
  this._startScan = function(deviceAddedCallback, deviceUpdatedCallback, deviceRemovedCallback, callback){
    callback ? true : callback = deviceRemovedCallback //allow for deviceRemovedCallback to be optional
    //Scanning Callbacks
    function deviceAdded(device){
      if(scanner._isCubelet(device)){
        device.btType = scanner._deviceType(device);
        device.inquiryRssi ? device.rssi = device.inquiryRssi : device.rssi = null
        deviceAddedCallback(device);
      }
    }
    function deviceUpdated(device){
      if(scanner._isCubelet(device)){
        device.btType = scanner._deviceType(device);
        device.inquiryRssi ? device.rssi = device.inquiryRssi : device.rssi = null
        deviceUpdatedCallback(device)
      }
    }
    function pairedDevices(devices){
      devices.forEach(function(device){
        if(device.connectable && device.paired){
          deviceAdded(device)
        }
      })
    }
    function deviceRemoved(device){
      //Ignore
      device.btType = scanner._deviceType(device);
      deviceRemovedCallback(device)
    }
    chrome.bluetooth.onDeviceAdded.addListener(deviceAdded);
    chrome.bluetooth.onDeviceChanged.addListener(deviceUpdated);
    chrome.bluetooth.onDeviceRemoved.addListener(deviceRemoved);

    var beginScan = function(){
      scanner._scanning = true

      //Fetch all paired devices first
      chrome.bluetooth.getDevices(pairedDevices);

      //Begin discovery
      chrome.bluetooth.startDiscovery(function() {
        if(chrome.runtime.lastError) {
          scanner._scanning = false
          callback(new Error(chrome.runtime.lastError.message))
          return
        }
        callback(null);
      });
    }

    if(scanner._scanning){
      scanner.stopDeviceScan(beginScan);
    }
    else{
      beginScan();
    }
  }
  //Override of Scanner
  this.startDeviceScan = function (deviceAddedCallback, deviceUpdatedCallback, deviceRemovedCallback, callback) {
    scanner._startScan(deviceAddedCallback, deviceUpdatedCallback, deviceRemovedCallback, callback);
  }
  this._stopScan = function(callback){
    chrome.bluetooth.stopDiscovery(function(){
      if(chrome.runtime.lastError) {
        scanner._scanning = false
        callback(new Error(chrome.runtime.lastError.message))
        return
      }
      callback(null)
    });
  }
  //Override of Sanner
  this.stopDeviceScan = function (callback) {
    if(!scanner._scanning){
      callback(null);
      return
    }
    scanner._scanning = false
    this._stopScan(callback);
  }

  this._compareDevice = function (device, otherDevice) {
    return device.address == otherDevice.address
  }

  this._isCubelet = function(device){
    return device.name && device.name.toLowerCase().indexOf('cubelet') === 0
  }

  this._deviceType = function(device){
    if(device.uuids.includes(SPP_UUID)){
      return 'classic';
    }
    return 'le';
  }
}

util.inherits(ChromeBtleScanner, Scanner)

module.exports = new ChromeBtleScanner()
