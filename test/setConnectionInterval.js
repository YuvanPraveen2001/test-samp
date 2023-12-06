var test = require('tape')
var config = require('./config')
var prompt = require('cli-prompt')
var debug = require('debug')


var cubelets = require('../index')('nobleSerial')
var __ = require('underscore')
var Protocol = cubelets.Protocol

function deviceAddedCallback(device){
  cubelets.stopDeviceScan(function(){
    client = cubelets.connect(device, function(err){
      if(err){
        console.log(err);
        return;
      }
      client.on('disconnect', function() {
        debug("Disconnected!");
      });
      console.log("Connected")
      beginTests();
    })
  })
}
function deviceUpdatedCallback(device){
  //console.log(device);
}

console.log("Start scan")
cubelets.startDeviceScan(deviceAddedCallback, deviceUpdatedCallback, function(err){
  console.log(err);
});

function beginTests(){
  test('setConnectionInterval', function(t){
    t.plan(1)
    client.setConnectionInteral(6,6, 6, 600, function(e){
      t.error(e, "Set connection interval")
    })
  })

  test.skip('throughput', function(t){

  })

  test('disconnect', function (t) {
    client.disconnect(function(){

    })
    client.on('disconnect', function(){
      t.end()
      process.exit()
    })
  })
}
