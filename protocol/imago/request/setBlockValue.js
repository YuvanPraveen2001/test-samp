var util = require('util')
var SetBlockValueCommand = require('../command/setBlockValue')

var SetBlockValueRequest = function (blockId, value) {
  SetBlockValueCommand.call(this, blockId, value)
}

util.inherits(SetBlockValueRequest, SetBlockValueCommand)

module.exports = SetBlockValueRequest
