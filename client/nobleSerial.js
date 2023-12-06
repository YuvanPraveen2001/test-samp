var debug = require('debug')('cubelets:nobleSerial')
var util = require('util')
var BTLEInterface = require('./btleInterface')
var Client = require('../client')
var async = require('async')
var noble;

if(process.platform === "win32"){
  noble = require('noble-winrt');
}
else if(process.platform === "darwin"){
  noble = require('noble-mac');
}
else{//TODO: breaking Windows 7
  noble = require('noble');
}

var scanner =  require('../scanner/nobleSerial')

noble.on('warning', function(message){
  debug("Warning Received: ", message);
});

var BTLEConnection = function (device, opts) {
  BTLEInterface.call(this, device, opts)

  var stream = this;
  var isOpen = false

  var writeCharacteristic = null;
  var reliableWriteCharacteristic = null;

  this._read = function (data) {
    if(typeof(data) === 'number'){
      debug('Received a non-buffer response, discarding')//Work-around for unknown issues where '16384' is received after packets.
      return
    }
    debug("Received: ", data);
    // do nothing
    stream.push(data);
  }

  this._write = function(data, enc, next){
    var count = 0;
    writeChunk(0);

    function writeChunk(i){
      debug("Writing chunk")
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
        if(reliableWriteCharacteristic){
          debug("Calling reliable write chunk.. wait for callback")
          debug(chunk)
          reliableWriteCharacteristic.write(chunk, false, callback);
        }
      }
      else{
        if(writeCharacteristic){
          debug("Calling write chunk.. wait for callback")
          debug(chunk)
          writeCharacteristic.write(chunk, true, callback);
        }
        else{
          debug("writeCharacteristic is null")
        }
      }
    }
  }

  function toArrayBuffer(arr){
    var r = new Uint8Array(arr);
    return r.buffer;
  }
  this._open = function (callback) {
    //Event handler for disconnect detect.
    device.once('disconnect', function(){
      isOpen = false;
      debug("Disconnected");
      //Call the disconnected event
      stream.close(function(){});
    });

    device.once('connect', function(){
      debug("Connected");
      isOpen = true;
      device.discoverSomeServicesAndCharacteristics([stream.SERVICE_UUID, stream.RELIABLE_SERVICE_UUID, stream.OTA_SERVICE_UUID], [stream.TX_UUID, stream.RX_UUID, stream.RELIABLE_TX_UUID, stream.RELIABLE_RX_UUID], function(err, services, characteristics){
        if(characteristics.length != 4){
          callback(new Error("Unable to discover characteristics."))
          return
        }

        if(services.find( service => service.uuid === formatUUID(stream.OTA_SERVICE_UUID))){
          stream.mode = stream.BOOTLOADER_MODE
          callback(null);
          return
        }
        else{
          stream.mode = stream.APPLICATION_MODE
        }

        writeCharacteristic = characteristics.find( characteristic => characteristic.uuid === formatUUID(stream.RX_UUID) );
        reliableWriteCharacteristic = characteristics.find( characteristic => characteristic.uuid === formatUUID(stream.RELIABLE_RX_UUID) );

        var readCharacteristic = characteristics.find( characteristic => characteristic.uuid === formatUUID(stream.TX_UUID) );
        var indicateCharacteristic = characteristics.find( characteristic => characteristic.uuid === formatUUID(stream.RELIABLE_TX_UUID) );

        function subscribe(characteristic, callback){
          characteristic.subscribe(function(err){
            if(err){
              debug("Subscribe Error: ", err)
              callback(err);
              return;
            }
            debug("Subscribed to TX_CHAR.")
            characteristic.on('data', stream._read);
            callback(null);
          });
        }

        async.waterfall([
            function(water_fall_callback) {
              subscribe(readCharacteristic, water_fall_callback)
            },
            function(water_fall_callback) {
              subscribe(indicateCharacteristic, water_fall_callback)
            },
            function(water_fall_callback){
              setTimeout(function(){
                stream.setConnectionInterval(water_fall_callback)
              }, 200)
            }
        ], function (err) {
            callback(err)
        });
      });
    });
    device.connect(function(err){
      if(err){
        callback(err)
      }
    });
  }
  this._close = function (callback) {
    if(isOpen){
      isOpen = false;
      device.disconnect(function(){
        callback(null);
      });
    }
    else{
      callback(null);
    }
  }

  this.setConnectionInterval = function(cb){
    var uint8 = new Buffer(8);
    uint8[0] = '<'.charCodeAt(0);
    uint8[1] = 0x0E;
    uint8[2] = 4;
    uint8[3] = '>'.charCodeAt(0);
    uint8[4] = stream.config['connectionIntervalMin']
    uint8[5] = stream.config['connectionIntervalMax']
    uint8[6] = stream.config['slaveLatency']
    uint8[7] = stream.config['supervisorTimeout']
    debug("Attempting to set connection interval", uint8, stream.config)
    reliableWriteCharacteristic.write(uint8, false, cb);
  }
}

function uuidCompare(uuid1, uuid2){
  uuid1 = formatUUID(uuid1);
  uuid2 = formatUUID(uuid2);
  return uuid1 == uuid2;
}

function formatUUID(uuid){
  return uuid.replace(/-/g, "").toLowerCase();
}

util.inherits(BTLEConnection, BTLEInterface)

module.exports = Client(scanner, BTLEConnection)
