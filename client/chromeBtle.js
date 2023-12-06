var debug = require('debug')('cubelets:chromeBtle')
var util = require('util')
var BTLEInterface = require('./btleInterface')
var Client = require('../client')
var xtend = require('xtend')

var scanner = require('../scanner/chromeBtle')

var SERVICE_DISCOVERY_TIMEOUT = 300
var servicesAddedTimeout = null

var discovered_services = {};
var discovered_characteristics = {};
var profile_initiated = false;

var ChromeBtleConnection = function (device, opts) {
  BTLEInterface.call(this, device, opts)
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
      console.log("Write:", chunk);
      if(stream.config["useReliableProtocol"] || count == stream.config['alternateEvery']){
        chrome.bluetoothLowEnergy.writeCharacteristicValue(discovered_characteristics[stream.RELIABLE_RX_UUID].instanceId, chunk, callback)
      }
      else{
        chrome.bluetoothLowEnergy.writeCharacteristicValue(discovered_characteristics[stream.RX_UUID].instanceId, chunk, callback)
      }
    }
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
    var value = new Buffer( new Uint8Array(characteristic.value));
    console.log("Read:", value);
    stream.push(value);
  }

  this.serviceDiscoveryFinished = function(){
    chrome.bluetoothLowEnergy.getServices(device.address, function(services){
      //If the OTA_SERVICE_UUID is present, set the mode and call the connect callback, else set up characteristics
      if(services.find(function(s){ return uuidCompare(s.uuid, stream.OTA_SERVICE_UUID) })){
        stream.mode = stream.BOOTLOADER_MODE
        isOpen = true;
        onConnectedCallback(null)
        return
      }
      for(var i = 0; i < services.length; i++){
        stream.initializeService(services[i], function(){
          stream.enable_notifications(onConnectedCallback);
        })
      }
    })
  }

  this.onServiceAdded = function(service){
    clearTimeout(servicesAddedTimeout)
    servicesAddedTimeout = setTimeout(stream.serviceDiscoveryFinished, SERVICE_DISCOVERY_TIMEOUT)
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

    })
  }

  this.setConnectionInterval = function (callback){
    var uint8 = new Uint8Array(8);
    uint8[0] = '<'.charCodeAt(0);
    uint8[1] = 0x0E;
    uint8[2] = 4;
    uint8[3] = '>'.charCodeAt(0);
    uint8[4] = stream.config['connectionIntervalMin']
    uint8[5] = stream.config['connectionIntervalMax']
    uint8[6] = stream.config['slaveLatency']
    uint8[7] = stream.config['supervisorTimeout']

    this._write(uint8, null, callback)
  }

  this.enable_notifications = function(callback){
    console.log("Enabling notifications/indications")
    chrome.bluetoothLowEnergy.startCharacteristicNotifications(discovered_characteristics[stream.TX_UUID].instanceId, {persistent: false}, function(){
      if(chrome.runtime.lastError) {
        console.log("Error enabling notifications: ", chrome.runtime.lastError.message)
      }
      chrome.bluetoothLowEnergy.startCharacteristicNotifications(discovered_characteristics[stream.RELIABLE_TX_UUID].instanceId, {persistent: false}, function(){
        console.log("Done enabling notifications/indications")
        if(chrome.runtime.lastError) {
          console.log("Error enabling notifications: ", chrome.runtime.lastError.message)
        }

        //Send an event that can be caught by the background script of a chrome app.
        chrome.runtime.sendMessage({status: "connected", type: 'le', address: device.address});

        stream.setConnectionInterval(function(){
          isOpen = true;
          callback(null)
        })
      })
    })
  }

  this.initializeService = function (service, callback){
    if (!service) {
      console.log('No service selected!');
      return;
    }
    console.log("Discovered Service:", service)
    //If not one of our services, return
    if(![stream.RELIABLE_SERVICE_UUID, stream.SERVICE_UUID].includes(service.uuid)){
      console.log("Not a service we care about.")
      return;
    }
    stream.mode = stream.APPLICATION_MODE

    //Store Service
    discovered_services[service.uuid] = service;

    stream.fetchCharacteristics(service.instanceId, callback)
  }

  this.fetchCharacteristics = function (serviceInstanceId, callback){

    //Get characteristics
    chrome.bluetoothLowEnergy.getCharacteristics(serviceInstanceId, function(characteristics){
      console.log("Found characteristics:", characteristics)

      if(characteristics.length < 2){
        setTimeout(function(){
          stream.fetchCharacteristics(serviceInstanceId, callback)
        }, 300)
        return
      }

      characteristics.forEach(function(characteristic){
        if([stream.TX_UUID, stream.RELIABLE_TX_UUID, stream.RX_UUID, stream.RELIABLE_RX_UUID].includes(characteristic.uuid)){
          console.log("Storing Characteristic: ", characteristic)
          discovered_characteristics[characteristic.uuid] = characteristic;
        }
        //If all characteristics have been found, stored, and configured, call the callback.
        if(!profile_initiated && Object.keys(discovered_characteristics).length == 4){
          console.log("All characteristics have been found.")
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
        console.log("Calling Disconnect")
        chrome.bluetoothLowEnergy.disconnect(device.address, function(e){
          console.log(e)
          setTimeout(function(){
            callback(null)
          }, 300)

        })
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

util.inherits(ChromeBtleConnection, BTLEInterface)

module.exports = Client(scanner, ChromeBtleConnection)
