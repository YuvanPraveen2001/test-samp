var BlockTypes = require('../blockTypes')

function TwentyKit () {
  var self = this
  self.blockTypes = [
    BlockTypes.DRIVE,
    BlockTypes.DRIVE,
    BlockTypes.ROTATE,
    BlockTypes.SPEAKER,
    BlockTypes.FLASHLIGHT,
    BlockTypes.BARGRAPH,
    BlockTypes.KNOB,
    BlockTypes.BRIGHTNESS,
    BlockTypes.DISTANCE,
    BlockTypes.DISTANCE,
    BlockTypes.TEMPERATURE,
    BlockTypes.INVERSE,
    BlockTypes.INVERSE,
    BlockTypes.MINIMUM,
    BlockTypes.MAXIMUM,
    BlockTypes.BATTERY,
    BlockTypes.PASSIVE,
    BlockTypes.PASSIVE,
    BlockTypes.BLOCKER,
    BlockTypes.BLOCKER
  ]
  self.name = 'Cubelets Twenty'
}

module.exports = TwentyKit
