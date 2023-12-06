/*Little script that finds com port based on the LED ident pattern of a Cubelet:
***ONLY WORKS ON WINDOWS**
*/

var cubelets = require('../index')()
var Protocol = cubelets.Protocol
var BluetoothSerialPort = require('bluetooth-serial-port').BluetoothSerialPort
var sp = require('serialport')
var btSerialPort = new BluetoothSerialPort()
var __ = require('underscore')

function comPortFromNamePattern(name, callback)
{
  btSerialPort.listPairedDevices(function(pairedDevices){
    __.each(pairedDevices, function(device){
      if(device.name.toLowerCase().indexOf(("cubelet-"+name).toLowerCase()) > -1){
        //We have found our device from BT serial port, time to find COM port
        findComPortByAddress(device.address, callback)
      }
    })
  })
}

function formatAddressForWindows(address){
  return address.replace(/:/g , "").toUpperCase();
}

function findComPortByAddress(address, callback){
  address = formatAddressForWindows(address)

  sp.list(function (err, ports) {
    __.each(ports, function(device){
      if(device.pnpId.indexOf(address) > -1){
        callback(device.comName)
      }
    })
  })
}
comPortFromNamePattern('BBC', function(comPort){
  console.log(comPort)
});
