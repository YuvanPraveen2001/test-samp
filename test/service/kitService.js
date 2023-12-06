var test = require('tape')
var KitService = require('../../services/kit')
var BlockTypes = require('../../blockTypes')
var Block = require('../../block')

var kitService = new KitService()

test('submit a kit', function (t) {
  t.plan(2)

  var blocks = [	new Block(2585, 1, BlockTypes.PASSIVE),
    new Block(2586, 1, BlockTypes.DRIVE),
    new Block(2587, 1, BlockTypes.FLASHLIGHT),
    new Block(2588, 1, BlockTypes.DISTANCE),
    new Block(2589, 1, BlockTypes.BRIGHTNESS),
    new Block(2590, 1, BlockTypes.BATTERY)
  ]

  kitService.buildKit(blocks, function (err, kitId) {
    if (!err) {
      t.pass('No error should be received')
    }
    if (kitId) {
      t.pass('Received valid kit ID: ' + kitId)
    }
  })
})

test('submit an invalid kit', function (t) {
  t.plan(1)

  var blocks = [	new Block(2000, 1, BlockTypes.UNKOWN),
    new Block(2586, 1, BlockTypes.DRIVE),
    new Block(2587, 1, BlockTypes.FLASHLIGHT),
    new Block(2588, 1, BlockTypes.DISTANCE),
    new Block(2589, 1, BlockTypes.BRIGHTNESS),
    new Block(2590, 1, BlockTypes.BATTERY)
  ]

  kitService.buildKit(blocks, function (err, kitId) {
    if (err) {
      t.pass('Expected error on invalid block')
    }
  })

})
