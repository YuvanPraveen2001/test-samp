var debug = require('debug')('cubelets:chromeBtle')
var util = require('util')
var Connection = require('../connection')
var Client = require('../client')
var xtend = require('xtend')

var scanner = require('../scanner/chromeBtle')

//Bootloader Service
var OTA_SERVICE_UUID =  '00060000-f8ce-11e4-abf4-0002a5d5c51b';
//Bootloader Characteristic
var OTA_COMMAND_UUID =  '00060001-f8ce-11e4-abf4-0002a5d5c51b';//Notify/Write

var discovered_services = {};
var discovered_characteristics = {};
var profile_initiated = false;

var ChromeBtleDFUConnection = function (device, opts) {
  Connection.call(this, device, opts)
  var stream = this;
  var isOpen = false
  var address = device.address || device.id

  var onConnectedCallback = null

  this._read = function (n) {
    // do nothing
  }

  this.isOpen = function () {
    return isOpen
  }

  this._write = function(data, enc, next){
    if(!next){
      next = enc
    }
    console.log("Write:", data);
    chrome.bluetoothLowEnergy.writeCharacteristicValue(discovered_characteristics[OTA_COMMAND_UUID].instanceId, toArrayBuffer(data), next)
  }

  function toArrayBuffer(arr){
    var r = new Uint8Array(arr);
    return r.buffer;
  }

  this.onDeviceChanged = function(_device){
    device = _device;
    //If we still think we are disconnected, but aren't. Close the stream.
    if(isOpen && !_device.connected && !_device.connecting){
      isOpen = false;
      console.log('Disconnected')
      stream.close(function(){});
    }
    console.log(_device);
  }
  this.onAdapterStateChanged = function(adapter){
    if (adapter.powered) {
      console.log("Adapter radio is on");
    } else {
      console.log("Adapter radio is off");
    }
  }

  this.onCharacteristicValueChanged = function(characteristic){
    debug("Received: ", characteristic.value);
    //Emit raw data: node-cubelets doesn't have the parsing logic for the DFU proccess.
    stream.emit("rawData", characteristic.value)
  }

  this.onServiceAdded = function(service){
    console.log("Service Added: ", service)
    stream.initializeService(service, function(){
      stream.enable_notifications(onConnectedCallback);
    });
  }

  this._open = function (callback) {
    profile_initiated = false;
    isOpen = false;

    chrome.bluetooth.onDeviceChanged.addListener(stream.onDeviceChanged);

    chrome.bluetooth.onAdapterStateChanged.addListener(stream.onAdapterStateChanged);

    chrome.bluetoothLowEnergy.connect(device.address, {persistent: false}, function(){
      if(chrome.runtime.lastError) {
        console.log(chrome.runtime.lastError.message)
        if(chrome.runtime.lastError.message != 'Already connected'){
          callback(new Error(chrome.runtime.lastError.message))
          return
        }
      }

      //onRead
      chrome.bluetoothLowEnergy.onCharacteristicValueChanged.addListener(stream.onCharacteristicValueChanged);

      onConnectedCallback = callback;
      chrome.bluetoothLowEnergy.onServiceAdded.addListener(stream.onServiceAdded);

      console.log("Calling getServices")
      chrome.bluetoothLowEnergy.getServices(device.address, function(services){
        console.log(services)
        //If these service have already been discovered, they wont be discovered again.
        var dfuService = services.find(function(s){ return uuidCompare(s.uuid, OTA_SERVICE_UUID) })
        if(dfuService){
          console.log("We already have the DFU Service, just initialize")
          stream.initializeService(dfuService, function(){
            stream.enable_notifications(onConnectedCallback);
          });
        }
      })
    })
  }

  this.enable_notifications = function(callback){
    console.log("Enabling notifications/indications")
    chrome.bluetoothLowEnergy.startCharacteristicNotifications(discovered_characteristics[OTA_COMMAND_UUID].instanceId, {persistent: false}, function(){
      if(chrome.runtime.lastError) {
        console.log("Error enabling notifications: ", chrome.runtime.lastError.message)
      }
      //Send an event that can be caught by the background script of a chrome app.
      chrome.runtime.sendMessage({status: "connected", type: 'le', address: device.address});

      isOpen = true;
      callback(null)
    })
  }

  this.initializeService = function (service, callback){
    if (!service) {
      console.log('No service selected!');
      return;
    }
    console.log("Discovered Service:", service)
    //If not one of our services, return
    if(![OTA_SERVICE_UUID].includes(service.uuid)){
      console.log("Not a service we care about.")
      return;
    }

    //Store Service
    discovered_services[service.uuid] = service;

    stream.fetchCharacteristics(service.instanceId, callback)
  }

  this.fetchCharacteristics = function (serviceInstanceId, callback){

    //Get characteristics
    chrome.bluetoothLowEnergy.getCharacteristics(serviceInstanceId, function(characteristics){
      console.log("Found characteristics:", characteristics)

      if(!characteristics || characteristics.length < 1){
        setTimeout(function(){
          stream.fetchCharacteristics(serviceInstanceId, callback)
        }, 300)
        return
      }

      characteristics.forEach(function(characteristic){
        if([OTA_COMMAND_UUID].includes(characteristic.uuid)){
          console.log("Storing Characteristic: ", characteristic)
          discovered_characteristics[characteristic.uuid] = characteristic;
          profile_initiated = true;
          callback(null);
        }
      })
    })
  }

  this._close = function (callback) {
    console.log("_close")
    discovered_services = {};
    discovered_characteristics = {};
    profile_initiated = false;

    isOpen = false;

    //Remove all listeners.
    chrome.bluetooth.onDeviceChanged.removeListener(stream.onDeviceChanged)
    chrome.bluetooth.onAdapterStateChanged.removeListener(stream.onAdapterStateChanged)
    chrome.bluetoothLowEnergy.onCharacteristicValueChanged.removeListener(stream.onCharacteristicValueChanged)
    chrome.bluetoothLowEnergy.onServiceAdded.removeListener(stream.onServiceAdded)

    chrome.runtime.sendMessage({status: "disconnected", type: 'le', address: device.address});

    function _disconnect(){
      if(device.connected){
        chrome.bluetoothLowEnergy.disconnect(device.address, callback)
      }
      else{
        callback(null);
      }
    }
    _disconnect();
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

util.inherits(ChromeBtleDFUConnection, Connection)

module.exports = Client(scanner, ChromeBtleDFUConnection)
