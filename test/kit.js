var test = require('tape')
var Kit = require('../kit/index.js')
var SixKit = require('../kit/six')
var TwelveKit = require('../kit/twelve')
var TwentyKit = require('../kit/twenty')
var BlockTypes = require('../blockTypes')
var Block = require('../block')

var kit = new Kit()

test('verify a valid six kit', function (t) {
  t.plan(3)

  var blocks = [
    new Block(2585, 1, BlockTypes.PASSIVE),
    new Block(2586, 1, BlockTypes.DRIVE),
    new Block(2587, 1, BlockTypes.FLASHLIGHT),
    new Block(2588, 1, BlockTypes.DISTANCE),
    new Block(2589, 1, BlockTypes.BRIGHTNESS),
    new Block(2590, 1, BlockTypes.BATTERY)
  ]
  kit.verifyKit(new SixKit(), blocks, function (isValid, missing, extra) {
    t.ok(isValid, 'Kit is a valid Cubelets Six kit')
    t.ok(missing.length === 0, 'No blocks are missing')
    t.ok(extra.length === 0, 'There are no extra blocks')
  })
})

test('verify a six kit with missing blocks', function (t) {
  t.plan(3)

  var blocks = [
    new Block(2585, 1, BlockTypes.PASSIVE),
    new Block(2586, 1, BlockTypes.DRIVE),
    new Block(2587, 1, BlockTypes.FLASHLIGHT),
    new Block(2588, 1, BlockTypes.DISTANCE)
  ]
  kit.verifyKit(new SixKit(), blocks, function (isValid, missing, extra) {
    t.notOk(isValid, 'Kit should not be valid')
    t.ok(missing.length === 2, 'Should be missing two blocks')
    t.ok(extra.length === 0, 'There are no extra blocks')
  })
})

test('verify a six kit with extra blocks', function (t) {
  t.plan(3)

  var blocks = [
    new Block(2585, 1, BlockTypes.PASSIVE),
    new Block(2586, 1, BlockTypes.DRIVE),
    new Block(2587, 1, BlockTypes.FLASHLIGHT),
    new Block(2588, 1, BlockTypes.DISTANCE),
    new Block(2589, 1, BlockTypes.BRIGHTNESS),
    new Block(2590, 1, BlockTypes.BATTERY),
    new Block(2591, 1, BlockTypes.BATTERY),
    new Block(2592, 1, BlockTypes.BATTERY)
  ]
  kit.verifyKit(new SixKit(), blocks, function (isValid, missing, extra) {
    t.notOk(isValid, 'Kit should not be valid')
    t.ok(missing.length === 0, 'Should be no missing blocks')
    t.ok(extra.length === 2, 'There should be two extra blocks')
  })
})

test('verify a six kit with extra AND missing blocks', function (t) {
  t.plan(3)

  var blocks = [
    new Block(2586, 1, BlockTypes.DRIVE),
    new Block(2587, 1, BlockTypes.FLASHLIGHT),
    new Block(2588, 1, BlockTypes.DISTANCE),
    new Block(2589, 1, BlockTypes.BRIGHTNESS),
    new Block(2590, 1, BlockTypes.BATTERY),
    new Block(2591, 1, BlockTypes.BATTERY),
    new Block(2592, 1, BlockTypes.BATTERY)
  ]
  kit.verifyKit(new SixKit(), blocks, function (isValid, missing, extra) {
    t.notOk(isValid, 'Kit should not be valid')
    t.ok(missing.length === 1, 'Should be missing a passive block')
    t.ok(extra.length === 2, 'There should be two extra blocks')
  })
})

test('verify a valid twelve kit', function (t) {
  t.plan(3)

  var blocks = [
    new Block(2585, 1, BlockTypes.BATTERY),
    new Block(2586, 1, BlockTypes.BLOCKER),
    new Block(2587, 1, BlockTypes.BLUETOOTH),
    new Block(2588, 1, BlockTypes.BRIGHTNESS),
    new Block(2589, 1, BlockTypes.DISTANCE),
    new Block(2590, 1, BlockTypes.DISTANCE),
    new Block(2590, 1, BlockTypes.DRIVE),
    new Block(2590, 1, BlockTypes.DRIVE),
    new Block(2590, 1, BlockTypes.FLASHLIGHT),
    new Block(2590, 1, BlockTypes.INVERSE),
    new Block(2590, 1, BlockTypes.PASSIVE),
    new Block(2590, 1, BlockTypes.ROTATE)
  ]
  kit.verifyKit(new TwelveKit(), blocks, function (isValid, missing, extra) {
    t.ok(isValid, 'Kit is a valid Cubelets Twelve kit')
    t.ok(missing.length === 0, 'No blocks are missing')
    t.ok(extra.length === 0, 'There are no extra blocks')
  })
})

test('verify a twelve kit with missing blocks', function (t) {
  t.plan(3)

  var blocks = [
    new Block(2585, 1, BlockTypes.BATTERY),
    new Block(2586, 1, BlockTypes.BLOCKER),
    new Block(2587, 1, BlockTypes.BLUETOOTH),
    new Block(2588, 1, BlockTypes.BRIGHTNESS),
    new Block(2589, 1, BlockTypes.DISTANCE),
    new Block(2590, 1, BlockTypes.DISTANCE),
    new Block(2590, 1, BlockTypes.DRIVE),
    new Block(2590, 1, BlockTypes.DRIVE),
    new Block(2590, 1, BlockTypes.FLASHLIGHT),
    new Block(2590, 1, BlockTypes.INVERSE),
    new Block(2590, 1, BlockTypes.PASSIVE)
  ]

  kit.verifyKit(new TwelveKit(), blocks, function (isValid, missing, extra) {
    t.notOk(isValid, 'Kit should not be valid')
    t.ok(missing.length === 1, 'Should be missing one blocks')
    t.ok(extra.length === 0, 'There are no extra blocks')
  })
})

test('verify a twelve kit with extra blocks', function (t) {
  t.plan(3)

  var blocks = [
    new Block(2585, 1, BlockTypes.BATTERY),
    new Block(2586, 1, BlockTypes.BLOCKER),
    new Block(2587, 1, BlockTypes.BLUETOOTH),
    new Block(2588, 1, BlockTypes.BRIGHTNESS),
    new Block(2589, 1, BlockTypes.DISTANCE),
    new Block(2590, 1, BlockTypes.DISTANCE),
    new Block(2590, 1, BlockTypes.DRIVE),
    new Block(2590, 1, BlockTypes.DRIVE),
    new Block(2590, 1, BlockTypes.FLASHLIGHT),
    new Block(2590, 1, BlockTypes.INVERSE),
    new Block(2590, 1, BlockTypes.PASSIVE),
    new Block(2590, 1, BlockTypes.ROTATE),
    new Block(2590, 1, BlockTypes.ROTATE),
    new Block(2590, 1, BlockTypes.ROTATE)
  ]
  kit.verifyKit(new TwelveKit(), blocks, function (isValid, missing, extra) {
    t.notOk(isValid, 'Kit should not be valid')
    t.ok(missing.length === 0, 'Should be no missing blocks')
    t.ok(extra.length === 2, 'There should be two extra blocks')
  })
})

test('verify a valid twenty kit', function (t) {
  t.plan(3)

  var blocks = [
    new Block(2585, 1, BlockTypes.DRIVE),
    new Block(2586, 1, BlockTypes.DRIVE),
    new Block(2585, 1, BlockTypes.ROTATE),
    new Block(2586, 1, BlockTypes.SPEAKER),
    new Block(2585, 1, BlockTypes.FLASHLIGHT),
    new Block(2586, 1, BlockTypes.BARGRAPH),
    new Block(2585, 1, BlockTypes.KNOB),
    new Block(2586, 1, BlockTypes.BRIGHTNESS),
    new Block(2585, 1, BlockTypes.DISTANCE),
    new Block(2586, 1, BlockTypes.DISTANCE),
    new Block(2585, 1, BlockTypes.TEMPERATURE),
    new Block(2586, 1, BlockTypes.INVERSE),
    new Block(2585, 1, BlockTypes.INVERSE),
    new Block(2586, 1, BlockTypes.MINIMUM),
    new Block(2585, 1, BlockTypes.MAXIMUM),
    new Block(2586, 1, BlockTypes.BATTERY),
    new Block(2585, 1, BlockTypes.PASSIVE),
    new Block(2586, 1, BlockTypes.PASSIVE),
    new Block(2585, 1, BlockTypes.BLOCKER),
    new Block(2586, 1, BlockTypes.BLOCKER)
  ]
  kit.verifyKit(new TwentyKit(), blocks, function (isValid, missing, extra) {
    t.ok(isValid, 'Kit is a valid Cubelets Twelve kit')
    t.ok(missing.length === 0, 'No blocks are missing')
    t.ok(extra.length === 0, 'There are no extra blocks')
  })
})

test('verify a twenty kit with missing blocks', function (t) {
  t.plan(3)

  var blocks = [
    new Block(2585, 1, BlockTypes.DRIVE),
    new Block(2586, 1, BlockTypes.DRIVE),
    new Block(2585, 1, BlockTypes.ROTATE),
    new Block(2586, 1, BlockTypes.SPEAKER),
    new Block(2585, 1, BlockTypes.FLASHLIGHT),
    new Block(2586, 1, BlockTypes.BARGRAPH),
    new Block(2585, 1, BlockTypes.KNOB),
    new Block(2586, 1, BlockTypes.BRIGHTNESS),
    new Block(2585, 1, BlockTypes.DISTANCE),
    new Block(2586, 1, BlockTypes.DISTANCE),
    new Block(2585, 1, BlockTypes.TEMPERATURE),
    new Block(2586, 1, BlockTypes.INVERSE),
    new Block(2585, 1, BlockTypes.INVERSE),
    new Block(2586, 1, BlockTypes.MINIMUM),
    new Block(2585, 1, BlockTypes.MAXIMUM),
    new Block(2586, 1, BlockTypes.BATTERY),
    new Block(2585, 1, BlockTypes.PASSIVE)
  ]

  kit.verifyKit(new TwentyKit(), blocks, function (isValid, missing, extra) {
    t.notOk(isValid, 'Kit should not be valid')
    t.ok(missing.length === 3, 'Should be missing three blocks')
    t.ok(extra.length === 0, 'There are no extra blocks')
  })
})

test('verify a twenty kit with extra blocks', function (t) {
  t.plan(3)

  var blocks = [
    new Block(2585, 1, BlockTypes.DRIVE),
    new Block(2586, 1, BlockTypes.DRIVE),
    new Block(2585, 1, BlockTypes.ROTATE),
    new Block(2586, 1, BlockTypes.SPEAKER),
    new Block(2585, 1, BlockTypes.FLASHLIGHT),
    new Block(2586, 1, BlockTypes.BARGRAPH),
    new Block(2585, 1, BlockTypes.KNOB),
    new Block(2586, 1, BlockTypes.BRIGHTNESS),
    new Block(2585, 1, BlockTypes.DISTANCE),
    new Block(2586, 1, BlockTypes.DISTANCE),
    new Block(2585, 1, BlockTypes.TEMPERATURE),
    new Block(2586, 1, BlockTypes.INVERSE),
    new Block(2585, 1, BlockTypes.INVERSE),
    new Block(2586, 1, BlockTypes.MINIMUM),
    new Block(2585, 1, BlockTypes.MAXIMUM),
    new Block(2586, 1, BlockTypes.BATTERY),
    new Block(2585, 1, BlockTypes.PASSIVE),
    new Block(2586, 1, BlockTypes.PASSIVE),
    new Block(2585, 1, BlockTypes.BLOCKER),
    new Block(2585, 1, BlockTypes.PASSIVE),
    new Block(2586, 1, BlockTypes.PASSIVE),
    new Block(2585, 1, BlockTypes.BLOCKER),
    new Block(2586, 1, BlockTypes.BLOCKER)
  ]
  kit.verifyKit(new TwentyKit(), blocks, function (isValid, missing, extra) {
    t.notOk(isValid, 'Kit should not be valid')
    t.ok(missing.length === 0, 'Should be no missing blocks')
    t.ok(extra.length === 3, 'There should be three extra blocks')
  })
})
