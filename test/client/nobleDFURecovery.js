var cubelets = require('../../index')('nobleSerial');
var cubeletsDFU = require('../../index')('nobleDFU');
var test = require('tape')
var fs = require('fs')
var config = require('../config')

var __ = require('underscore')
var prompt = require('cli-prompt')
var debug = require('debug')('cubelets:nobleDFU')

var Block = require('../../block')
var BlockTypes = require('../../blockTypes')
var Version = require('../../version')
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
  if(USE_LOCAL){
    var payload = fs.readFileSync(PAYLOAD_PATH, 'utf8')
    begin(device, payload)
  }
  else {
    var block = new Block(1, 0, BlockTypes.BLE_HAT)
    block._mcuType = 1
    block._applicationVersion = new Version(4,0,0)
    block._bootloaderVersion = new Version(4,1,0)
    block._hardwareVersion = new Version(2,0,0)
    console.log("Fetching latest Bluetooth Hat Firmware...");
    firmwareService.fetchLatestHex(block, function(err, res){
      if(!err){
        console.log("Beginning update process...")
        payload = res.hexBlob
        begin(device, payload)
      }
      else {
        console.log("An error occurred while fetching latest firmware.", err);
      }
    })
  }
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
