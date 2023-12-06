var Scanner = require('../scanner')
var util = require('util')
var xtend = require('xtend')

var SERVICE_UUID =  '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';

var BTLEScanner = function (opts) {
  Scanner.call(this)
  var scanner = this;

  this._getDevices = function (callback) {
    //TODO: check bluetoothle.isInitialized(isInitialized);
      //If not: initialize

    var devices = [];
    function retrieveConnectedSuccess(devices){
      callback(null, devices);
    }
    function retrieveConnectedError(e){
      callback(e);
    }
    bluetoothle.retrieveConnected(retrieveConnectedSuccess, retrieveConnectedError, {
      "services": [
        SERVICE_UUID
      ]
    });
  }

  // Add a discovery method that can call a callback repeatedly with RSSi updates
  this._startScan = function(deviceAddedCallback, deviceUpdatedCallback, callback){
    //TODO: Windows forces you to pair
    if (window.cordova.platformId === "windows") {
      bluetoothle.retrieveConnected(retrieveConnectedSuccess, handleError, {});
    }

    //Scanning Callbacks
    var beginScan = function(){
      bluetoothle.startScan(scanReturn, scanError, params);
    }
    var scanReturn = function(result){
      if(result.status == "scanStarted"){
        callback(null);
      }
      else if(result.status == "scanResult"){
        if(result.name && (result.name.toLowerCase().indexOf('cubelet') === 0 || result.name.toLowerCase().indexOf('nordic_uart') >= 0)){
          result.btType = 'le';
          if(scanner._add(result)){
            //New Device
            deviceAddedCallback(result);
          }
          else{
            //Updated Device
            deviceUpdatedCallback(result);
          }
        }
      }
    }
    var scanError = function(e){
      callback(e);
    }
    if(scanner._scanning){
      scanner.stopDeviceScan(beginScan);
    }
    else{
      beginScan();
    }

    var params = {
      "services": [
      ],
      "allowDuplicates": true,
      "scanMode": bluetoothle.SCAN_MODE_LOW_LATENCY,
      "matchMode": bluetoothle.MATCH_MODE_AGGRESSIVE,
      "matchNum": bluetoothle.MATCH_NUM_MAX_ADVERTISEMENT,
      "callbackType": bluetoothle.CALLBACK_TYPE_ALL_MATCHES
    }
  }
  //Override of Scanner
  this.startDeviceScan = function (deviceAddedCallback, deviceUpdatedCallback, callback) {
    scanner._scanning = true
    scanner._startScan(deviceAddedCallback, deviceUpdatedCallback, callback);
  }
  this._stopScan = function(callback){
    bluetoothle.stopScan(function(){
        //Success Callback
        callback(null);
    }, function(e){
        //Error Callback
        callback(e);
    });
  }
  //Override of Sanner
  this.stopDeviceScan = function (callback) {
    scanner._scanning = false
    this._stopScan(callback);
  }

  this._compareDevice = function (device, otherDevice) {
    return device.address == otherDevice.address
  }
}

util.inherits(BTLEScanner, Scanner)

module.exports = new BTLEScanner()
