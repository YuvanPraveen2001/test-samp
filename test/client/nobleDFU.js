var cubelets = require('../../index')('nobleSerial');
var cubeletsDFU = require('../../index')('nobleDFU');
var test = require('tape')
var fs = require('fs')
var config = require('../config')

var __ = require('underscore')
var prompt = require('cli-prompt')
var debug = require('debug')('cubelets:nobleDFU')

var ImagoFirmwareService = require('../../services/imagoFirmware')
var firmwareService = new ImagoFirmwareService()

var USE_LOCAL = false
var PAYLOAD_PATH = './upgrade/hex/cypress/bootloadable.cyacd'

var Protocol = require('../../protocol/imago')
var CypressDFU = require('cypress-dfu')

var client = null;

CypressDFU.on('progress', function (progress) {
  console.log(['Flashing... ', progress, '%'].join(''))
})
CypressDFU.on('flashStart', function () {
  console.log('Flashing...')
})
CypressDFU.on('flashFinished', function () {
  console.log('Flashing...Success')
  client.disconnect(function(){})
  process.exit(0)
})
CypressDFU.on('error', function (err, code, message) {
  console.log(err, code, message)
})

function deviceAddedCallback(device){
  debug(device)
  cubelets.stopDeviceScan(function(){
    client = cubelets.connect(device, function(err){
      if(err){
        console.log(err);
        return;
      }

      var payload = null;
      client.once('disconnect', function() {
        console.log("Disconnected!");
        begin(device, payload)
      });

      client.fetchOriginBlock(function(err, originBlock){
        client.fetchConfiguration(function(err, configuration){
          originBlock._applicationVersion = configuration.applicationVersion
          originBlock._bootloaderVersion = configuration.bootloaderVersion
          originBlock._hardwareVersion = configuration.hardwareVersion

          if(USE_LOCAL){
            payload = fs.readFileSync(PAYLOAD_PATH, 'utf8')
            var req = new Protocol.messages.SetModeRequest(0)
            client.sendRequest(req, function (err, res) {

            }, 200)
          }
          else{
            firmwareService.fetchLatestHex(originBlock, function(err, res){
              payload = res.hexBlob
              var req = new Protocol.messages.SetModeRequest(0)
              client.sendRequest(req, function (err, res) {

              }, 200)
            })
          }
        })
      })

    })
  })
}

function deviceUpdatedCallback(device){
  //
}

console.log("Start scan")
cubelets.startDeviceScan(deviceAddedCallback, deviceUpdatedCallback, function(err){
  console.log(err);
});

function begin(device, payload){
  //Connect using nobleDFU
  console.log("Atttempting to connect to DFU")

  client = cubeletsDFU.connect(device, function(err){
    console.log(err)
    CypressDFU.startUpdate(payload, client.getConnection()._write)
  })

  client.getConnection().on('rawData', function(data){
    CypressDFU.onData(data)
  })
}
