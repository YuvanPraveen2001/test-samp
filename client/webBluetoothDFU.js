var debug = require('debug')('cubelets:webBluetoothDFU')
var util = require('util')
var Scanner = require('../scanner')
var Connection = require('../connection')
var Client = require('../client')
var xtend = require('xtend')

var DFU_SERVICE_UUID =            "00060000-f8ce-11e4-abf4-0002a5d5c51b";
var DFU_CMD_CHARACTERISTIC_UUID = "00060001-f8ce-11e4-abf4-0002a5d5c51b";

var scanner =  require('../scanner/webBluetooth')

var WebBluetoothDFUConnection = function (device, opts) {
  Connection.call(this, device, opts)
  var stream = this;
  var writeCharacteristic = null;

  this._read = function (event) {
    // do nothing
  }

  function toArrayBuffer(arr){
    var r = new Uint8Array(arr);
    return r.buffer;
  }

  function onRead(event){
    debug("onRead", event)
    var value = event.target.value;
    var data = new Uint8Array(value.buffer);
    stream.emit('rawData', data)
  }

  this._write = function(data, enc, next){
    if(!next){
      next = enc
    }
    writeCharacteristic.writeValue(toArrayBuffer(data))
    .then(_ => {
      setTimeout(next, 10);
    })
    .catch(error => {
      debug(error);
      next(error)
    });
  }

  function onDisconnect(){
    debug("onDisconnect was called via gattserverdisconnected")
    stream.close(function(){});
  }

  this._open = function (callback) {
    return device.gatt.connect()
    .then(server => {
      stream.server = server
      device.addEventListener('gattserverdisconnected', onDisconnect);
      debug('Getting the DFU Service...');
      return server.getPrimaryService(DFU_SERVICE_UUID);
    })
    .then(service => {
      debug('Getting Characteristic...');
      return Promise.all([
        service.getCharacteristic(DFU_CMD_CHARACTERISTIC_UUID)
          .then(characteristic => {
            writeCharacteristic = characteristic;
            debug('charactersitic obtained');
          })
      ]);
    }).then(_ => {
      debug('Starting notifications...')
      return writeCharacteristic.startNotifications().then(_ => {
        debug('Notifications started');
        writeCharacteristic.addEventListener('characteristicvaluechanged', onRead);
        callback(null)
      });
    })
    .catch(error => {
      debug('Argh! ' + error);
      callback(error)
    });
  }

  this._close = function (callback) {
    debug("_close")
    function _disconnect(){
      if (device.gatt.connected) {
        device.gatt.disconnect();
      }
      callback(null);
    }
    _disconnect();
  }
}

util.inherits(WebBluetoothDFUConnection, Connection)

module.exports = Client(scanner, WebBluetoothDFUConnection)
