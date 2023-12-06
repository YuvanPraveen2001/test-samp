var debug = require('debug')('cubelets:webBluetooth')
var util = require('util')
var Scanner = require('../scanner')
var BTLEInterface = require('./btleInterface')
var Client = require('../client')
var xtend = require('xtend')

var scanner =  require('../scanner/webBluetooth')

var WebBluetoothConnection = function (device, opts) {
  BTLEInterface.call(this, device, opts)
  var stream = this;
  var address = device.address || device.id

  var rxCharacteristic = null;
  var reliableRxCharacteristic = null;
  var txCharacteristic = null;
  var reliableTxCharacteristic = null;

  this._read = function (n) {
    // do nothing
  }

  this._write = function(data, enc, next){
    var count = 0;
    writeChunk(0);

    function writeChunk(i){
      var start = i * stream.config['chunkSize'];
      var end = start + stream.config['chunkSize'];
      var chunk = data.slice(start, end);
      var delay = stream.config["useReliableProtocol"] ? stream.config['writeWithResponseDelay'] : stream.config["writeDelay"]

      if(chunk.length > 0){
        count++;
        write(chunk, count, function(err){
          if(err){
            next(err);
          }
          else{
            setTimeout(function(){
              writeChunk(i+1);
            }, delay);
          }
        })
        if(count > stream.config['alternateEvery']){count=0;}
      }
      else{
        next();
      }
    }

    function write(chunk, count, callback){
      if(stream.config["useReliableProtocol"] || count == stream.config['alternateEvery']){
        debug("<<", chunk, reliableRxCharacteristic);
        reliableRxCharacteristic.writeValue(chunk)
        .then(_ => {
          callback(null);
        })
        .catch(error => {
          debug(error);
          callback(error)
        });
      }
      else{
        debug("<<", chunk, rxCharacteristic);
        rxCharacteristic.writeValue(chunk)
        .then(_ => {
          callback(null);
        })
        .catch(error => {
          debug(error);
          callback(error)
        });
      }
    }
  }

  function toArrayBuffer(arr){
    var r = new Uint8Array(arr);
    return r.buffer;
  }

  function onRead(event){
    debug("onRead", event)
    var value = event.target.value;
    var data = new Uint8Array(value.buffer);
    var buf = new Buffer(data);
    stream.push(buf)
  }
  function onDisconnect(){
    debug("onDisconnect was called via gattserverdisconnected")
    stream.close(function(){});
  }

  this._open = function (callback) {
    return device.gatt.connect()
    .then(server => {
      debug("server obtained")
      stream.server = server
      return server
    }).then(server => {
      debug("fetching service")
      return server.getPrimaryService(stream.OTA_SERVICE_UUID)
    })
    .then(bleService => {
      debug("BOOTLOADER MODE")
      stream.mode = stream.BOOTLOADER_MODE
      callback(null)
      throw new Error('abort promise chain');
    })
    .catch(error => {
      if (error.message === 'abort promise chain') {
        //just swallow the error
        debug("Promise was aborted")
        throw new Error('abort promise chain');
      }
      else if(stream.mode != stream.BOOTLOADER_MODE){
        debug("APPLICATION MODE")
        stream.mode = stream.APPLICATION_MODE
        device.addEventListener('gattserverdisconnected', onDisconnect);
        debug('Getting the UART Service...');
        return stream.server.getPrimaryService(stream.SERVICE_UUID);
      }
      debug("Error while in BOOTLOADER MODE", error)
    })
    .then(service => {
      debug('Getting Characteristics...');
      return Promise.all([
        service.getCharacteristic(stream.TX_UUID)
          .then(characteristic => {
            txCharacteristic = characteristic;
            debug('Tx charactersitic obtained');

          }),
        service.getCharacteristic(stream.RX_UUID)
          .then(rx_characteristic => {
            rxCharacteristic = rx_characteristic;
            debug('Rx charactersitic obtained');
          }),
      ]);
    }).then(_ => {
      debug('Starting notifications...')
      return txCharacteristic.startNotifications().then(_ => {
        debug('Notifications started');
        txCharacteristic.addEventListener('characteristicvaluechanged', onRead);

      });
    }).then(_ => {
      debug('Attempting to get reliable service...')
      return stream.server.getPrimaryService(stream.RELIABLE_SERVICE_UUID);
    })
    .then(service => {
      debug('Getting Characteristics...');
      return Promise.all([
        service.getCharacteristic(stream.RELIABLE_TX_UUID)
          .then(characteristic => {
            reliableTxCharacteristic = characteristic;
            debug('Tx charactersitic obtained');

          }),
        service.getCharacteristic(stream.RELIABLE_RX_UUID)
          .then(rx_characteristic => {
            reliableRxCharacteristic = rx_characteristic;
            debug('Rx charactersitic obtained');
          }),
      ]);
    }).then(_ => {
      debug('Starting notifications...')
      return reliableTxCharacteristic.startNotifications().then(_ => {
        debug('Notifications started');
        reliableTxCharacteristic.addEventListener('characteristicvaluechanged', onRead);
        callback(null)
      });
    })
    .catch(error => {
      if (error.message === 'abort promise chain') {
        //just swallow the error
        debug("Promise was aborted")
      }
      else{
        debug('Argh! ' + error);
        callback(error)
      }
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

  this.setConnectionInterval = function(cb){
    var uint8 = new Uint8Array(8);
    uint8[0] = '<'.charCodeAt(0);
    uint8[1] = 0x0E;
    uint8[2] = 4;
    uint8[3] = '>'.charCodeAt(0);
    uint8[4] = stream.config['connectionIntervalMin']
    uint8[5] = stream.config['connectionIntervalMax']
    uint8[6] = stream.config['slaveLatency']
    uint8[7] = stream.config['supervisorTimeout']
    debug("Attempting to set connection interval", uint8, stream.config)

    rxCharacteristic.writeValue(uint8)
    .then(_ => {
      cb(null);
    })
    .catch(error => {
      debug(error);
      cb(error)
    });
  }
}

util.inherits(WebBluetoothConnection, BTLEInterface)

module.exports = Client(scanner, WebBluetoothConnection)
