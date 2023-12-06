var cubelets = require('../../index')('nobleSerial');
var test = require('tape')
var fs = require('fs')
var config = require('../config')

var __ = require('underscore')
var prompt = require('cli-prompt')
var debug = require('debug')('cubelets:nobleDFU')
var Protocol = require('../../protocol/imago')

var client = null;



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
        process.exit()
      });

      var req = new Protocol.messages.SetModeRequest(0)
      client.sendRequest(req, function (err, res) {

      }, 200)
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
