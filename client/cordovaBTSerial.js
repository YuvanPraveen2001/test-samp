/*
  Relies on https://github.com/soltius/BluetoothClassicSerial
*/
var debug = require('debug')('cubelets:cordovaBTSerial')
var util = require('util')
var Scanner = require('../scanner')
var Connection = require('../connection')
var Client = require('../client')
var xtend = require('xtend')

var ANDROID_INTERFACE_ID = "00001101-0000-1000-8000-00805F9B34FB";
var IOS_INTERFACE_ID = "com.modrobotics.cubelets";
var interfaceId;


var CordovaBTSerialScanner = function (opts) {
  Scanner.call(this)
  var scanner = this;

  this._getDevices = function (callback) {
    var result = []
    bluetoothClassicSerial.list(function(devices){
      devices.forEach(function (device) {
        var name = device.name
        var deviceId = device.id
        if (name.indexOf('Cubelet') === 0) {
          result.push({
            deviceId: deviceId,
            name: name
          })
        }
      })
      callback(result)
    }, function(err){
      callback(err);
    });
  }

  // Add a discovery method that can call a callback repeatedly with RSSi updates
  this._startScan = function(deviceAddedCallback, deviceUpdatedCallback, callback){
    bluetoothClassicSerial.setDeviceDiscoveredListener(function(device){
      debug(device)
      var name = device.name
      var deviceId = device.id
      if (name.indexOf('Cubelet') === 0) {
        deviceAddedCallback({
          deviceId: deviceId,
          name: name
        });
        if(platform == "ios"){
          callback(null);
        }
      }
    });
    bluetoothClassicSerial.discoverUnpaired(function(devices) {
      debug(devices);
      bluetoothClassicSerial.clearDeviceDiscoveredListener();
      if(platform != "ios"){
        callback(null);
      }
    }, function(err){
      callback(err);
    });
  }
  //Override of Scanner
  this.startDeviceScan = function (deviceAddedCallback, deviceUpdatedCallback, callback) {
    scanner._scanning = true
    scanner._startScan(deviceAddedCallback, deviceUpdatedCallback, callback);
  }
  this._stopScan = function(callback){
    callback(null);
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

util.inherits(CordovaBTSerialScanner, Scanner)

var CordovaBTSerialConnection = function (device, opts) {
  Connection.call(this, device, opts)

  var stream = this;
  var platform = window.cordova.platformId.toLowerCase();

  if(platform == "android"){
    interfaceId = ANDROID_INTERFACE_ID;
  }
  else if(platform == "ios"){
    interfaceId = IOS_INTERFACE_ID;
  }

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
      bluetoothClassicSerial.write(chunk, interfaceId, function(){
        //debug("Write Success");
        callback(null);
      }, function(e){
        //debug("Write Error: ", e);
        callback(e);
      });
    }
  }
  function toArrayBuffer(arr){
    var r = new Uint8Array(arr);
    return r.buffer;
  }

  this._open = function (callback) {
    debug("Opening: ", device);
    bluetoothClassicSerial.connect(device.deviceId, interfaceId, function(){
      debug("Connected");
      bluetoothClassicSerial.subscribeRawData(function (data) {
        stream.push(new Buffer(data));
      }, function(){
        debug("Failed to subscribe to raw data.");
      });
      callback(null);
    }, function(err){
      debug("Connecting Failed: ", err);
      callback(new Error("Failed to connect."));
    });
  }

  this._close = function (callback) {
    bluetoothClassicSerial.disconnect(function(){
      callback(null);
    }, function(){
      callback(null);
    });
  }
}

util.inherits(CordovaBTSerialConnection, Connection)

module.exports = Client(new CordovaBTSerialScanner(), CordovaBTSerialConnection)
