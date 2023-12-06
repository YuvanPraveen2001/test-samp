var BlockTypes = require('../blockTypes')

function SixKit () {
  var self = this
  self.blockTypes = [
    BlockTypes.BATTERY,
    BlockTypes.BRIGHTNESS,
    BlockTypes.DISTANCE,
    BlockTypes.DRIVE,
    BlockTypes.FLASHLIGHT,
    BlockTypes.PASSIVE
  ]
  self.name = 'Cubelets Six'
}

module.exports = SixKit
