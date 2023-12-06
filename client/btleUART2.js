/*
  Client intended to work with the plugin "cordova-plugin-ble-central":
  https://www.npmjs.com/package/cordova-plugin-ble-central

  Roadmap:
    - Add support for setting the connection priority for Android
      - bluetoothGatt.requestConnectionPriority(BluetoothGatt.CONNECTION_PRIORITY_HIGH)

*/
var debug = require('debug')('cubelets:btle2')
var util = require('util')
var BTLEInterface = require('./btleInterface')
var Client = require('../client')
var xtend = require('xtend')

var scanner = require('../scanner/btleUART2')

//Write w/o Response commands can get overwhelmed (and get received out of order) if sent too fast.
var IOS_DELAY_BETWEEN_WRITES = 10;
var ANDROID_DELAY_BETWEEN_WRITES = 0;

var DEFAULT_WRITE_DELAY = window.cordova.platformId.toLowerCase() == "ios" ? IOS_DELAY_BETWEEN_WRITES : ANDROID_DELAY_BETWEEN_WRITES;

var BTLEConnection = function (device, opts) {
  BTLEInterface.call(this, device, opts)
  var stream = this;
  var address = device.address || device.id

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
        count++
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
        ble.write(address, stream.RELIABLE_SERVICE_UUID, stream.RELIABLE_RX_UUID, toArrayBuffer(chunk), function(){
          debug("<<", chunk);
          callback(null);
        }, function(e){
          debug(e);
          callback(e);
        });
      }
      else{
        ble.writeWithoutResponse(address, stream.SERVICE_UUID, stream.RX_UUID, toArrayBuffer(chunk), function(){
          debug("<<", chunk);
          callback(null);
        }, function(e){
          debug(e);
          callback(e);
        });
      }
    }
  }

  function toArrayBuffer(arr){
    var r = new Uint8Array(arr);
    return r.buffer;
  }

  this._open = function (callback) {
    ble.refreshDeviceCache(address, 100, function(){}, function(){});

    //TODO: Check if we are/were already connected. Disconnect if so
    ble.connect(address, function(peripheral){
      debug("Connection established", peripheral)
      if(stream.HANDLE_RECOVERY_MODE && (peripheral.services.includes(stream.OTA_SERVICE_UUID) || peripheral.services.includes(stream.OTA_SERVICE_UUID.toUpperCase()))){
        debug("BLE Hat is in update mode and needs recovered.")
        stream.mode = stream.BOOTLOADER_MODE
        callback(null)
        return
      }
      else{
        stream.mode = stream.APPLICATION_MODE
        ble.startNotification(peripheral.id, stream.SERVICE_UUID, stream.TX_UUID, function(buffer){
          var data = new Uint8Array(buffer);
          var buf = new Buffer(data);
          debug("(notification)>>", buf);
          stream.push(buf);
        }, function(e){
          debug("Error subscribing to notifications", e)
        });

        if(peripheral.services.includes(stream.RELIABLE_SERVICE_UUID) || peripheral.services.includes(stream.RELIABLE_SERVICE_UUID.toUpperCase()))
        {
          ble.startNotification(peripheral.id, stream.RELIABLE_SERVICE_UUID, stream.RELIABLE_TX_UUID, function(buffer){
            var data = new Uint8Array(buffer);
            var buf = new Buffer(data);
            debug("(indication)>>", buf);
            stream.push(buf);
          }, function(e){
            debug("Error subscribing to notifications", e)
          });
        }

        stream.setConnectionInterval()
        callback(null)
      }
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

  this.setConnectionInterval = function(){
    var connectionParams = new ArrayBuffer(8);
    connectionParams[0] = '<'.charCodeAt(0);
    connectionParams[1] = 0x0E;
    connectionParams[2] = 4;
    connectionParams[3] = '>'.charCodeAt(0);
    connectionParams[4] = stream.config['connectionIntervalMin']
    connectionParams[5] = stream.config['connectionIntervalMax']
    connectionParams[6] = stream.config['slaveLatency']
    connectionParams[7] = stream.config['supervisorTimeout']

    debug("Attempting to set connection interval", connectionParams, stream.config)

    ble.write(address, stream.RELIABLE_SERVICE_UUID, stream.RELIABLE_RX_UUID, connectionParams, function(){
      debug("Successfully set connection interval", connectionParams);
    }, function(e){
      debug("Error Setting connection interval", e);
    });
  }
}

util.inherits(BTLEConnection, BTLEInterface)

module.exports = Client(scanner, BTLEConnection)
