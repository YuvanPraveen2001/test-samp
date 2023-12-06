var test = require('tape')
var fs = require('fs')
var ImagoFirmwareService = require('../../services/imagoFirmware')
var Block = require('../../block')
var BlockTypes = require('../../blockTypes')
var MCUTypes = require('../../mcuTypes')
var Version = require('../../version')
var ImagoProtocol = require('../../protocol/imago')
var ImagoProgram = ImagoProtocol.Program

var firmwareService = new ImagoFirmwareService()


test('Test bad version', function (t) {
  t.plan(1)
  var block = new Block(1337, 99, BlockTypes.DISTANCE)
  block._mcuType = MCUTypes.PIC
  block._applicationVersion = null
  firmwareService.checkForUpdate(block, function(err, res)
  {
  	t.ok(err, "Fetching with invalid versions should produce an error")
  })
})

test('Test bad block type', function (t) {
  t.plan(1)
  var block = new Block(1337, 99, BlockTypes.UNKNOWN)
  firmwareService.checkForUpdate(block, function(err, res)
  {
  	t.ok(err, "Fetching with invalid block type should produce an error")
  })
})

test('Test check for updated version', function (t) {
  t.plan(3)
  var block = new Block(1337, 99, BlockTypes.THRESHOLD)
  block._mcuType = MCUTypes.PIC
  block._applicationVersion = new Version(4,0,0)
  block._bootloaderVersion = new Version(4,1,0)
  block._hardwareVersion = new Version(2,0,0)

  firmwareService.checkForUpdate(block, function(err, res)
  {
  	t.error(err, "Should not be an error with valid data")
  	t.ok(res.updateAvailable, "There should be an update available")
  	var program = new ImagoProgram(res.hexBlob)
  	t.ok(program.valid, "Hex file should be a valid program")
  })
})

test('Test fetch latest hex', function (t) {
  t.plan(3)
  var block = new Block(1337, 99, BlockTypes.DISTANCE)
  block._mcuType = MCUTypes.PIC
  block._applicationVersion = new Version(4,0,0)
  block._bootloaderVersion = new Version(4,1,0)
  block._hardwareVersion = new Version(2,0,0)

  firmwareService.fetchLatestHex(block, function(err, res)
  {
  	t.error(err, "Should not be an error with valid data")
  	t.ok(res.updateAvailable, "There should be an update available")
  	var program = new ImagoProgram(res.hexBlob)
  	t.ok(program.valid, "Hex file should be a valid program")
  })
})


test('Test check for bootloader update', function(t) {
	t.plan(4)
	var block = new Block(1337, 4, BlockTypes.BARGRAPH)
	block._mcuType = MCUTypes.PIC
	block._bootloaderVersion = new Version(4, 0, 0)
	block._hardwareVersion = new Version(2, 0, 0)

	firmwareService.checkForBootloaderUpdate(block, function(err, res) {
		t.error(err, "Should not be an error with valid data")
		t.ok(res.updateAvailable, "There should be an update available")
		var bootloaderProgram = new ImagoProgram(res.bootloaderHexBlob)
		var applicationProgram = new ImagoProgram(res.applicationHexBlob)
		t.ok(bootloaderProgram.valid, "Bootloader hex file should be a valid program")
		t.ok(applicationProgram.valid, "Application hex file should be a valid program")
	})
})

//Test bootstraps
test('Test get latest bootstrap', function(t) {
	t.plan(3);
	var block = new Block(1337, 4, BlockTypes.BARGRAPH)
	block._mcuType = MCUTypes.PIC
	block._bootloaderVersion = new Version(4, 0, 0)
	block._hardwareVersion = new Version(2, 0, 0)

	firmwareService.fetchBootstrapFirmware(block, function(err, res) {
		t.error(err, "Should not be an error with valid data")
		t.ok(res.updateAvailable, "There should be an update available")
		var bootloaderProgram = new ImagoProgram(res.hexBlob)
		t.ok(bootloaderProgram.valid, "Bootstrap hex file should be a valid program")

	})
})

//Test typeswitchs
test('Test get typeswitch', function(t) {
	t.plan(2);
	var block = new Block(1337, 4, BlockTypes.BARGRAPH)
	block._mcuType = MCUTypes.PIC
	block._bootloaderVersion = new Version(4, 0, 0)
	block._hardwareVersion = new Version(2, 0, 0)

	firmwareService.fetchTypeSwitchApplication(block, function(err, res) {
		t.error(err, "Should not be an error with valid data")
		var bootloaderProgram = new ImagoProgram(res.hexBlob)
		t.ok(bootloaderProgram.valid, "Type Switch hex file should be a valid program")

	})
})

//Test Deep Memory Bootloader
test('Test get deep memory bootloader', function(t) {
	t.plan(2);
	var block = new Block(1337, 4, BlockTypes.BARGRAPH)
	block._mcuType = MCUTypes.PIC
	block._bootloaderVersion = new Version(4, 0, 0)
	block._hardwareVersion = new Version(2, 0, 0)

	firmwareService.fetchDeepMemoryBootloader(block, function(err, res) {
		t.error(err, "Should not be an error with valid data")
		var bootloaderProgram = new ImagoProgram(res.hexBlob)
		t.ok(bootloaderProgram.valid, "The hex file should be a valid program")

	})
})

//Test Modified bootstrap
test('Test get major update bootstrap', function(t) {
	t.plan(2);
	var block = new Block(1337, 4, BlockTypes.BARGRAPH)
	block._mcuType = MCUTypes.PIC
	block._bootloaderVersion = new Version(4, 0, 0)
	block._hardwareVersion = new Version(2, 0, 0)

	firmwareService.fetchMajorUpdateBootstrap(block, function(err, res) {
		t.error(err, "Should not be an error with valid data")
		var bootloaderProgram = new ImagoProgram(res.hexBlob)
		t.ok(bootloaderProgram.valid, "Bootstrap hex file should be a valid program")

	})
})

//Check for cache miss
test('Test cache miss', function(t) {
	t.plan(3);
	console.time("cache-miss");
	var block = new Block(1337, 4, BlockTypes.PASSIVE	)
	block._mcuType = MCUTypes.PIC
	block._bootloaderVersion = new Version(4, 0, 0)
	block._hardwareVersion = new Version(2, 0, 0)

	firmwareService.fetchMajorUpdateBootstrap(block, function(err, res) {
		t.error(err, "Should not be an error with valid data")
		var bootloaderProgram = new ImagoProgram(res.hexBlob)
		t.ok(bootloaderProgram.valid, "Bootstrap hex file should be a valid program")
		t.notOk(res.cacheHit)
		console.timeEnd("cache-miss");
	})
})

//Check for cache hit
test('Test for cache hit', function(t) {
	t.plan(3);
	console.time("cache-hit");
	var block = new Block(1337, 4, BlockTypes.PASSIVE	)
	block._mcuType = MCUTypes.PIC
	block._bootloaderVersion = new Version(4, 0, 0)
	block._hardwareVersion = new Version(2, 0, 0)

	firmwareService.fetchMajorUpdateBootstrap(block, function(err, res) {
		t.error(err, "Should not be an error with valid data")
		var bootloaderProgram = new ImagoProgram(res.hexBlob)
		t.ok(bootloaderProgram.valid, "Bootstrap hex file should be a valid program")
		t.ok(res.cacheHit, "Should have hit cache")
		console.timeEnd("cache-hit");
	})
})

test('Test for bad cache keys', function(t){
  t.plan(2)

  //(blockId, hopCount, blockType, mcuType) {
  var block1 = new Block(11378, 4, BlockTypes.BATTERY, MCUTypes.PIC)
  block1._bootloaderVersion = new Version(4,3,0)
  block1._hardwareVersion = new Version(2,1,0)
  block1._applicationVersion = new Version(4,3,0)

  var block2 = new Block(55448, 3, BlockTypes.BATTERY, MCUTypes.PIC)
  block2._bootloaderVersion = new Version(4,1,0)
  block2._hardwareVersion = new Version(2,1,0)
  block2._applicationVersion = new Version(4,1,0)

  firmwareService.checkForBootloaderUpdate(block1, function(err, response){
    t.notOk(response.updateAvailable, "There should not be an update available for 4.3.0 as of 4.15.16")
    firmwareService.checkForBootloaderUpdate(block2, function(err, response2){
      t.ok(response2.updateAvailable, "There should be an update available for a block running 4.1.0")
    })
  })
})

test('Test for BLE Hat', function(t){
  t.plan(1)

  //(blockId, hopCount, blockType, mcuType) {
  var block1 = new Block(11378, 4, BlockTypes.BLE_HAT, MCUTypes.CYPRESS)
  block1._bootloaderVersion = new Version(1,0,0)
  block1._hardwareVersion = new Version(3,0,0)
  block1._applicationVersion = new Version(4,0,0)

  firmwareService.checkForUpdate(block1, function(err, response){
    t.ok(response.updateAvailable, "There should be an update available for a hat running 4.0.0")
  })
})

//Check for disk fallback
test.skip('Test for disk fallback', function(t) {
	t.plan(1);

})
