var debug = require('debug')('cubelets:nobleDFU')
var util = require('util')
var Connection = require('../connection')
var Client = require('../client')
var xtend = require('xtend')
var async = require('async')
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

var scanner =  require('../scanner/nobleSerial')

//Bootloader Service
var OTA_SERVICE_UUID =  '00060000-F8CE-11E4-ABF4-0002A5D5C51B';
//Bootloader Characteristic
var OTA_COMMAND_UUID =  '00060001-F8CE-11E4-ABF4-0002A5D5C51B';//Notify/Write

noble.on('warning', function(message){
  debug("Warning Received: ", message);
});

var BTLEConnection = function (device, opts) {
  Connection.call(this, device, opts)

  var stream = this;
  var isOpen = false

  var writeCharacteristic = null;

  this._read = function (data) {
    if(typeof(data) === 'number'){
      debug('Received a non-buffer response, discarding')//Work-around for unknown issues where '16384' is received after packets.
      return
    }
    debug("Received: ", data);
    //Emit raw data: node-cubelets doesn't have the parsing logic for the DFU proccess.
    stream.emit("rawData", data)
  }

  this._write = function(data, enc, next){
    if(!next){
      next = enc
    }
    debug("Calling reliable write chunk.. wait for callback")
    debug(data)
    writeCharacteristic.write(toBuffer(data), false, next);
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
      device.discoverSomeServicesAndCharacteristics([OTA_SERVICE_UUID], [OTA_COMMAND_UUID], function(err, services, characteristics){
        writeCharacteristic = characteristics.find( characteristic => characteristic.uuid === formatUUID(OTA_COMMAND_UUID) );

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
        subscribe(writeCharacteristic, callback)
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
}

function uuidCompare(uuid1, uuid2){
  uuid1 = formatUUID(uuid1);
  uuid2 = formatUUID(uuid2);
  return uuid1 == uuid2;
}

function formatUUID(uuid){
  return uuid.replace(/-/g, "").toLowerCase();
}

function toBuffer (ab) {
  return Buffer.from(ab)
}

util.inherits(BTLEConnection, Connection)

module.exports = Client(scanner, BTLEConnection)
