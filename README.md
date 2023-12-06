node-cubelets
=============

Communicate with Cubelets using node.js

What are Cubelets?
==================

[Cubelets](https://www.modrobotics.com/cubelets) are magnetic blocks that can be snapped together to make an endless variety of robots. You can communicate with and program them in node.js with a Bluetooth Cubelet.

Install (Windows)
=================

- Recommended: [nvm](https://github.com/coreybutler/nvm-windows) for managing node versions.
- NodeJs v12.0.0 (32-bit): (`nvm install 12.0.0` if using nvm )
- Python 2.7
- Git
- Visual Studio 2017 Community Edition (With Visual C++ and command line tools)
    - `npm install --global --production windows-build-tools`
- For building node-cubelets
    - `git clone https://github.com/modrobotics/node-cubelets.git`
    - `cd node_cubelets & npm install`
- For using node-cubelets in your own project
    - `npm install https://github.com/modrobotics/node-cubelets.git`

Install (macOS)
=================

- Recommended: [nvm](https://github.com/creationix/nvm) for managing node versions.
- NodeJs v12.0.0
- Xcode
- Git
- For building node-cubelets
    - `git clone https://github.com/modrobotics/node-cubelets.git`
    - `cd node_cubelets & npm install`
- For using node-cubelets in your own project
    - `npm install https://github.com/modrobotics/node-cubelets.git`


Client Types
=============
There are a few different client types that use different ways to connect to Cubelets.

- serial (Windows/OSX)[default]: Bluetooth Classic. Establish a connection using a virtual serial port relies on [node-serialport](https://github.com/EmergingTechnologyAdvisors/node-serialport).
- bluetoothSerial (Windows/OSX): Bluetooth Classic. Uses SPP to establish a connection relies on [node-bluetooth-serial-port](https://github.com/eelcocramer/node-bluetooth-serial-port).
- cordova (cordova iOS/Android): Bluetooth Classic. Can be used in apps built with cordova relies on the [com.modrobotics.bluetooth](https://bitbucket.org/modrobotics/cubelets-app/src/777cf3ee9ffadcaf2d305b5af0aca7d17364753a/plugins/com.modrobotics.bluetooth/?at=master) plugin.
- cordovaBTSerial (cordova iOS/Android): BT classic client for cordova relies on the cordova plugin [BluetoothClassicSerial](https://github.com/soltius/BluetoothClassicSerial).
- chromeSerial (ChromeBooks): Bluetooth Classic. Uses the [chrome.bluetooth API](https://developer.chrome.com/apps/bluetooth) to establish an SPP connection.
- ~btleUART (experimental cordova iOS/Android): BTLE client for cordova relies on [cordova-plugin-bluetoothle](https://github.com/randdusing/cordova-plugin-bluetoothle).~
- btleUART2 (cordova iOS/Android): Bluetooth Low Energy. BTLE client for codova that relies on [cordova-plugin-ble-central](https://www.npmjs.com/package/cordova-plugin-ble-central)
- nobleSerial (macOS and Windows): Bluetooth Low Energy.  Uses [noble](https://github.com/sandeepmistry/noble) on macOS and [noble-winrt](https://github.com/Timeular/noble-winrt) for Windows.
- chromeBTLE (Chromebooks): Uses the ChromeBook Bluetooth Low Energy API
- webBluetooth (Chrome Web Browser: macOS, Windows, ChromeBooks, Android): Implements WebBluetooth spec currently only supported in Chrome
- btleDFU (Cypress DFU Android/iOS)
- chromeDFU (Cypress DFU ChromeBooks)
- nobleDFU (Cypress DFU macOS/Windows)
- webBluetoothDFU (Cyrpess DFU WebBluetooth)
- demo (any): Doesn't actually connect to a construction, simply responds to messages. Useful for testing and UI updates.

## Choosing a Client Type
The type of client that is used can be specified when requiring the cubelets module.
```js
//The default client type is serial.
var cubelets = require('cubelets');

//Cubelets will use the bluetoothSerial client type.
var cubelets = require('cubelets')('bluetoothSerial');

```

Discover
=========
You can either list paired Bluetooth Cubelets:
```js
cubelets.getDevices(function(devices){
  console.log(devices);
})
```

or discover nearby Bluetooth Cubelets:
```js
var cubelets = require('cubelets')('bluetoothSerial');

function deviceFound(device){
  //This is a newly discovered device
  console.log(device);
}
function deviceUpdated(device){
  //This is an update to a device we have already found.
  //   You can use new information such as RSSI to make decisions.
  console.log(device);
}

cubelets.startDeviceScan(deviceFound, deviceUpdated, function(err){
  if(err){
    console.log(err);
  }
  else{
    console.log("Scan started.");

    //Stop the scan after 15 seconds.
    setTimeout(function(){
      cubelets.stopDeviceScan(function(err){

      })
    }, 15000)
  }
})
```

Virtual Serial Port (No discovery)
==================================
You can also connect to your Cubelets using a hard-coded serial port and bypass
the discovery process.

First, pair your Bluetooth Cubelet to OS X, Windows, or Linux. A serial connection will be used to communicate with the Cubelet using node-serialport.

To find the name of the device on OS X and Linux:

```bash
> ls /dev | grep Cubelet
cu.Cubelet-MOD
tty.Cubelet-MOD
```

On Windows, go to the Properties of the device in the Device Manager, and find the COM port for the Cubelet. The name will be something like "COM3", "COM42", etc.

Then, create a device:

```js
//OSX Style
var device = {
  path: '/dev/cu.Cubelet-GPW-AMP-SPP'
}

//Windows Style
var device = {
  path: 'COM3'
}
```

Connect
=======

Then, open a connection:

```js
var cubelets = require('cubelets')

var client = cubelets.connect(device, function (err) {
  if(err){
    //Connection was unsuccessful
    console.log(err);
    return;
  }
  //Connection Success
  console.log('connected to', device)
})

```

Construction Discovery
======================

Once connected, you can discover other Cubelets connected to the Bluetooth Cubelet.

```js
// Listen for incremental updates to the graph,
// as data becomes available.
client.on('updateBlockMap', function () {
  console.log('Origin block', client.getOriginBlock())
  console.log('Neighbor blocks', client.getNeighborBlocks())
  console.log('All blocks (except origin)', client.getAllBlocks())
  console.log('By ID', client.findBlockById(1234))
  console.log('By hop count', client.filterBlocksByHopCount(2))
  console.log('Graph', client.getGraph())
})

// Fetch the graph. Callback is fired once entire
// graph has been retrieved.
client.fetchGraph(function (err, graph) {
  console.log('Nodes:', graph.nodes)
  console.log('Edges:', graph.links)
})
```

Demos/Examples
===============
See [`bin/`](https://github.com/modrobotics/node-cubelets/tree/master/bin) and [`test/`](https://github.com/modrobotics/node-cubelets/tree/master/test) for further examples.
