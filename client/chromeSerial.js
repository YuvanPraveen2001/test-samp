var debug = require('debug')('cubelets:chromeSerial')
var util = require('util')
var Connection = require('../connection')
var Client = require('../client')
var xtend = require('xtend')

var scanner = require('../scanner/chromeSerial')

var ChromeSerialConnection = function (device, opts) {
  Connection.call(this, device, opts)

  var address = device['address'] || '00:00:00:00:00:00'
  var services = device['services']
  var channelID = (typeof device['channelID'] !== undefined) ?
    device.channelID : (Array.isArray(services) && services.length > 0) ?
      services[0].channelID : 1

  var stream = this
  var socketId = null;
  var isOpen = false

  this._read = function (n) {
    // do nothing
  }

  this._write = function (chunk, enc, next) {
    if(socketId){
      chrome.bluetoothSocket.send(socketId, toArrayBuffer(chunk), function(bytes_sent) {
        if (chrome.runtime.lastError) {
          next(chrome.runtime.lastError.message, bytes_sent);
        } else {
          next(null, bytes_sent);
        }
      })
    }
  }
  function toArrayBuffer(arr){
    var r = new Uint8Array(arr);
    return r.buffer;
  }

  this._open = function (callback) {

    chrome.bluetoothSocket.create(function(createInfo) {
      socketId = createInfo.socketId;
      chrome.bluetoothSocket.connect(socketId,
        address, "00001101-0000-1000-8000-00805f9b34fb", function(){
          if (chrome.runtime.lastError) {
            callback(chrome.runtime.lastError.message)
          } else {
            //Send an event that can be caught by the background script of a chrome app.
            chrome.runtime.sendMessage({status: "connected", socketId: socketId});
            // Profile implementation here.
            isOpen = true
            chrome.bluetoothSocket.onReceiveError.addListener(function(errorInfo) {
              // Cause is in errorInfo.error.
              stream.emit('error', errorInfo.errorMessage);
              isOpen = false;
              chrome.bluetoothSocket.disconnect(socketId);
              socketId = null;
              stream.close(function(){});
            });

            chrome.bluetoothSocket.onReceive.addListener(function(receiveInfo) {
              if (receiveInfo.socketId != socketId){
                return;
              }
              // receiveInfo.data is an ArrayBuffer.
              stream.push(new Buffer( new Uint8Array(receiveInfo.data)));
            });

            if (callback) {
              callback(null)
            }

          }
        });
    });
  }

  this._close = function (callback) {
    if(!socketId){
      if(callback){
        callback(null)
      }
    }
    else{
      chrome.bluetoothSocket.disconnect(socketId);
      isOpen = false;
      socketId = null;
      if (callback) {
        callback(null)
      }
    }
  }
}

util.inherits(ChromeSerialConnection, Connection)

module.exports = Client(scanner, ChromeSerialConnection)
