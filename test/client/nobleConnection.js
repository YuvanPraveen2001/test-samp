var cubelets = require('../../index')('nobleSerial');
var test = require('tape')
var fs = require('fs')
var config = require('../config')
var Protocol = cubelets.Protocol
var Block = require('../../block')
var BlockTypes = require('../../blockTypes')
var MCUTypes = require('../../mcuTypes')
var InfoService = require('../../services/info')
var FirmwareService = require('../../services/firmware')
var ImagoFirmwareService = cubelets.ImagoFirmwareService;
var ImagoProtocol = require('../../protocol/imago')
var ImagoProgram = ImagoProtocol.Program
var ImagoFlash = ImagoProtocol.Flash
//var Version = require('../version')
var __ = require('underscore')
var prompt = require('cli-prompt')
var debug = require('debug')('cubelets:nobleSerialTest')

var firmwareService = new ImagoFirmwareService()
var client = null;

var testIntervalId = null;

function sendEcho(){
  var echo = new Buffer([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  client.sendRequest(new ImagoProtocol.messages.EchoRequest(echo), function (err, response) {
    console.log(err, response)
  })
}

function deviceAddedCallback(device){
  console.log("Device Added", device);
  cubelets.stopDeviceScan(function(){
    client = cubelets.connect(device, function(err){
      if(err){
        console.log(err);
        return;
      }
      client.on('disconnect', function() {
        clearInterval(testIntervalId)
        console.log("Disconnected!");
        console.timeEnd("connectedFor");//Display how long we were connected for.
        process.exit();
      });
      console.log("Connected")
      console.time("connectedFor");//Start tracking time for connection
      testIntervalId = setInterval(sendEcho, 10000)
    })
  })
}
function deviceUpdatedCallback(device){
  console.log("Device Updated: ", device);
  //console.log(device);
}

console.log("Start scan")
cubelets.startDeviceScan(deviceAddedCallback, deviceUpdatedCallback, function(err){
  console.log(err);
});
