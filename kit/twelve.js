var BlockTypes = require('../blockTypes')

function TwelveKit () {
  var self = this
  self.blockTypes = [
    BlockTypes.BATTERY,
    BlockTypes.BLOCKER,
    BlockTypes.BLUETOOTH,
    BlockTypes.BRIGHTNESS,
    BlockTypes.DISTANCE,
    BlockTypes.DISTANCE,
    BlockTypes.DRIVE,
    BlockTypes.DRIVE,
    BlockTypes.FLASHLIGHT,
    BlockTypes.INVERSE,
    BlockTypes.PASSIVE,
    BlockTypes.ROTATE
  ]
  self.name = 'Cubelets Twelve'
}

module.exports = TwelveKit
