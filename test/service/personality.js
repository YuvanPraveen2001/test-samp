var test = require('tape')
var fs = require('fs')
var PersonalityService = require('../../services/personality')
var Block = require('../../block')
var BlockTypes = require('../../blockTypes')
var MCUTypes = require('../../mcuTypes')
var Version = require('../../version')
var ImagoProtocol = require('../../protocol/imago')
var ImagoProgram = ImagoProtocol.Program

var personalityService = new PersonalityService()


test('Fetch all personalities source', function(t){
  t.plan(2)
  personalityService.fetchAllPersonalitiesSource(function(err, res){
    console.log(res.cacheHit)
    console.log(res.cacheSource)
    t.error(err, "Should not be an error with valid data")
    t.ok(Object.keys(res.personalities).length == 17, "There should be at least one personality per block type (17 block types as of 2019)")
  })
})

test('Fetch all personalities source should be cached', function(t){
  t.plan(1)
  personalityService.fetchAllPersonalitiesSource(function(err, res){
    t.ok(res.cacheHit, "We should have found all personalities in local cache.")
  })
})

test('Test bad version', function (t) {
  t.plan(1)
  var block = new Block(1337, 99, BlockTypes.DISTANCE)
  block._mcuType = MCUTypes.PIC
  block._applicationVersion = null
  personalityService.fetchPersonalitiesByBlock(block, function(err, res)
  {
  	t.ok(err, "Fetching with invalid versions should produce an error")
  })
})

test('Test bad block type', function (t) {
  t.plan(1)
  var block = new Block(1337, 99, BlockTypes.UNKNOWN)
  personalityService.fetchPersonalitiesByBlock(block, function(err, res)
  {
  	t.ok(err, "Fetching with invalid block type should produce an error")
  })
})

test('Test fetch personalities', function (t) {
  t.plan(7)
  var block = new Block(1337, 99, BlockTypes.THRESHOLD)
  block._mcuType = MCUTypes.PIC
  block._applicationVersion = new Version(4,0,0)
  block._bootloaderVersion = new Version(4,3,0)
  block._hardwareVersion = new Version(2,0,0)

  var config = {
    return_source: true,
    return_blockly: true
  }

  personalityService.fetchPersonalitiesByBlock(block, config, function(err, res)
  {
  	t.error(err, "Should not be an error with valid data")
    t.ok(res.success, "There should be an update available")
    t.ok(res.personalities.length > 0, "There should be personalities returned")
    t.ok(res.count == res.personalities.length, "The expected number of personalities should have been returned")
    var program = new ImagoProgram(res.personalities[0].hex)
    t.ok(program.valid, "Hex file should be a valid program")
    t.ok(typeof(res.personalities[0]["source_code"]) === "string", "Source code should be included")
    t.ok(typeof(res.personalities[0]["source_blockly"]) === "string", "Blockly source should be included")
  })
})
