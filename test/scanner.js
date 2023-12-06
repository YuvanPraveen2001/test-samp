var scanner = require('../client/bluetoothSerial')

scanner.getDevices(function(err, devices)
{
	console.log(err)
	console.log(devices)
})
