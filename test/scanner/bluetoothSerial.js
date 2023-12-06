var test = require('tape')
var scanner = require('../../scanner/bluetoothSerial')

function validateDevice(t, device){
  //Devices contain BT type
  t.ok(device.btType == 'classic', "Scanner indicates if device is classic or LE")

  //Devices contain address
  var re = /^(([A-Fa-f0-9]{2}[:]){5}[A-Fa-f0-9]{2}[,]?)+$/
  t.ok(re.test(device.address), "Device contains valid bluetooth address")

  //Devices contain name with Cubelet in it
  t.ok(device.name.includes("Cubelet"), "Device discovered is a Cubelet")
}

test('get devices', function (t){
  scanner.getDevices(function(devices){
    t.pass('response ')

    t.ok(devices.length > 0, "Devices are returned")

    devices.forEach(function(device){
      validateDevice(t, device)
    })
    t.end()
  })
})

test('scan devices', function (t) {
  var count = 0;
  function deviceAdded(device){
    count++;
    validateDevice(t, device)
  }
  function deviceUpdated(device){
    count++;
    validateDevice(t, device)
  }
  scanner.startDeviceScan(deviceAdded, deviceUpdated, function(e){
    t.ok(count > 0, "Devices were returned")
    t.error(e, "Scanner does not return an error")
    t.end()
  })
})
