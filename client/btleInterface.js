var util = require('util')
var debug = require('debug')('cubelets:btleClient')
var Connection = require('../connection')
var Client = require('../client')

//Configurable Connection Parameters
var defaultConnectionConfig = {
  "writeDelay": 0,
  "writeWithResponseDelay": 0,
  "chunkSize": 20,
  "useReliableProtocol": false,
  "connectionIntervalMin": 6,
  "connectionIntervalMax": 6,
  "supervisorTimeout": 300,
  "slaveLatency": 0,
  "alternateEvery": 3
}

var BTLEInterface = function (device, opts) {
  Connection.call(this, device, opts)
  //Nordic UART UUIDs
  this.SERVICE_UUID =  '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  this.RX_UUID =       '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
  //This is the characteristic we should receive data on. Perhaps switch
  this.TX_UUID =       '6e400003-b5a3-f393-e0a9-e50e24dcca9e';//Notification Characteristic

  this.RELIABLE_SERVICE_UUID =  '6e400004-5a3f-393e-0a9e-50e24dcca9e0';
  this.RELIABLE_RX_UUID =       '6e400006-5a3f-393e-0a9e-50e24dcca9e0';//Write w/ Response Characteristic
  this.RELIABLE_TX_UUID =       '6e400005-5a3f-393e-0a9e-50e24dcca9e0';//Indication Characteristic

  this.OTA_SERVICE_UUID = '00060000-f8ce-11e4-abf4-0002a5d5c51b';

  var stream = this;

  //Flag to determine if we should try to detect if a Hat is in bootloader mode.
  //This is disabled in the cubelets app to allow for updated v4.0.0 hats w/o
  //incorrectly detecting them as being in update mode.
  stream.HANDLE_RECOVERY_MODE = true

  stream.BOOTLOADER_MODE = 0
  stream.APPLICATION_MODE = 1
  stream.mode = null

  stream.config = defaultConnectionConfig

  this.updateProtocolConfig = function(newConfig){
    stream.config = Object.assign(stream.config, newConfig);
    stream.setConnectionInterval(function(){})
    debug("Updated Config: ", stream.config);
  }

  this.setConnectionInterval = function(callback){
    throw new Error('not implemented')
  }
}

util.inherits(BTLEInterface, Connection)
module.exports = BTLEInterface
