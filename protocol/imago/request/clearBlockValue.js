var util = require('util')
var ClearBlockValueCommand = require('../command/clearBlockValue')

var ClearBlockValueRequest = function (blockId) {
  ClearBlockValueCommand.call(this, blockId)
}

util.inherits(ClearBlockValueRequest, ClearBlockValueCommand)

module.exports = ClearBlockValueRequest
