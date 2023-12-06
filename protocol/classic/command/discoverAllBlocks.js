var util = require('util')
var Message = require('../message')

var DiscoverAllBlocksCommand = function (blockId, value) {
  Message.call(this)
}

util.inherits(DiscoverAllBlocksCommand, Message)

module.exports = DiscoverAllBlocksCommand
