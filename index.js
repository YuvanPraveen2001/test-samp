// Hack to compile mobile clients that need to be ran through browserify..Don't call this.
function BrowserifyHack() {
  require('./client/btleUART2.js');
  require('./client/btleDFU.js');
  require('./client/cordovaBTSerial.js');
  require('./client/cordova.js');
  require('./client/chromeSerial.js');
  require('./client/chromeBtle.js');
  require('./client/chromeDFU.js');
  require('./client/webBluetooth.js');
  require('./client/webBluetoothDFU.js');
}

var validClientTypes = [  'bluetoothSerial',
                          'browser',
                          'btleUART2',
                          'btleDFU',
                          'chrome',
                          'chromeSerial',
                          'chromeBtle',
                          'chromeDFU',
                          'cordova',
                          'cordovaBTSerial',
                          'nobleSerial',
                          'nobleDFU',
                          'webBluetooth',
                          'webBluetoothDFU',
                          'demo',
                          'net',
                          'serial'];

module.exports = function(clientType){
  if(!clientType || validClientTypes.indexOf(clientType) < 0){
    clientType = 'serial';
  }
  var cubelets = require('./client/'+clientType+'.js');

  cubelets.Block = require('./block')
  cubelets.BlockTypes = require('./blockTypes')
  cubelets.MCUTypes = require('./mcuTypes')
  cubelets.Version = require('./version')
  cubelets.InfoService = require('./services/info')
  cubelets.FirmwareService = require('./services/firmware')
  cubelets.ImagoFirmwareService = require('./services/imagoFirmware')
  return cubelets;
}
