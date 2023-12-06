/*
  Client intended to work with the plugin "cordova-plugin-ble-central":
  https://www.npmjs.com/package/cordova-plugin-ble-central

*/

var debug = require('debug')('cubelets:btle2')
var util = require('util')
var Connection = require('../connection')
var Client = require('../client')
var xtend = require('xtend')

var scanner = require('../scanner/btleUART2')

//Bootloader Service
var OTA_SERVICE_UUID =  '00060000-F8CE-11E4-ABF4-0002A5D5C51B';
//Bootloader Characteristic
var OTA_COMMAND_UUID =  '00060001-F8CE-11E4-ABF4-0002A5D5C51B';//Notify/Write

var BTLEConnection = function (device, opts) {
  Connection.call(this, device, opts)
  var stream = this;
  var address = device.address || device.id

  this._read = function (n) {
    // do nothing
  }

  this._write = function(data, enc, next){
    if(!next){
      next = enc
    }

    ble.write(address, OTA_SERVICE_UUID, OTA_COMMAND_UUID, toArrayBuffer(data), function(){
      debug("<<", data);
      next(null);
    }, function(e){
      debug(e);
      next(e);
    });
  }

  function toArrayBuffer(arr){
    var r = new Uint8Array(arr);
    return r.buffer;
  }

  this._open = function (callback) {
    ble.refreshDeviceCache(address, 100, function(){}, function(){});
    ble.connect(address, function(peripheral){
      debug("Connection established", peripheral)
      ble.startNotification(peripheral.id, OTA_SERVICE_UUID, OTA_COMMAND_UUID, function(buffer){
        var data = new Uint8Array(buffer);
        var buf = new Buffer(data);
        stream.emit("rawData", data)
      }, function(e){
        debug("Error subscribing to notifications", e)
      });

      callback(null)
    }, function(e){
      //Error or disconnect
      debug(e)
      if (e.errorMessage && e.errorMessage.toLowerCase().includes("disconnect")){
        stream.close(function(){});
      }
    });
  }

  this._close = function (callback) {
    debug("_close")
    function _disconnect(){
      ble.disconnect(address, callback, callback);
    }
    _disconnect();
  }
}

util.inherits(BTLEConnection, Connection)

module.exports = Client(scanner, BTLEConnection)
