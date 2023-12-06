var Protocol = require('../../protocol')
var Message = require('./message')
var Parser = require('../parser')
var Strategy = require('./strategy')
var Program = require('./program')
var Flash = require('./flash')
var xtend = require('xtend/mutable')

var messages = {
  SetBlockLEDCommand: require('./command/setBlockLED'),
  SetBlockValueCommand: require('./command/setBlockValue'),
  ClearBlockValueCommand: require('./command/clearBlockValue'),
  DiscoverAllBlocksCommand: require('./command/discoverAllBlocks'),
  RegisterBlockValueEventCommand: require('./command/registerBlockValueEvent'),
  UnregisterBlockValueEventCommand: require('./command/unregisterBlockValueEvent'),
  UnregisterAllBlockValueEventsCommand: require('./command/unregisterAllBlockValueEvents'),
  ResetCommand: require('./command/reset'),

  KeepAliveRequest: require('./request/keepAlive'),
  KeepAliveResponse: require('./response/keepAlive'),
  GetNeighborBlocksRequest: require('./request/getNeighborBlocks'),
  GetNeighborBlocksResponse: require('./response/getNeighborBlocks'),
  GetAllBlocksRequest: require('./request/getAllBlocks'),
  GetAllBlocksResponse: require('./response/getAllBlocks'),

  BlockValueEvent: require('./event/blockValue'),
  FlashProgressEvent: require('./event/flashProgress'),
  FlashCompleteEvent: require('./event/flashComplete')
}

function code(c) {
  return c.charCodeAt(0)
}

var ClassicProtocol = new Protocol({
  commands: [
    [code('e'), messages.SetBlockLEDCommand],
    [code('s'), messages.SetBlockValueCommand],
    [code('t'), messages.ClearBlockValueCommand],
    [code('i'), messages.DiscoverAllBlocksCommand],
    [code('b'), messages.RegisterBlockValueEventCommand],
    [code('u'), messages.UnregisterBlockValueEventCommand],
    [code('q'), messages.UnregisterAllBlockValueEventsCommand],
    [code('x'), messages.ResetCommand]
  ],
  requests: [
    [code('a'), messages.KeepAliveRequest],
    [code('m'), messages.GetNeighborBlocksRequest],
    [code('k'), messages.GetAllBlocksRequest],
  ],
  responses: [
    [code('l'), messages.KeepAliveResponse],
    [code('n'), messages.GetNeighborBlocksResponse],
    [code('j'), messages.GetAllBlocksResponse],
  ],
  events: [
    [code('b'), messages.BlockValueEvent],
    [code('U'), messages.FlashProgressEvent],
    [code('X'), messages.FlashCompleteEvent]
  ]
})

ClassicProtocol.messages = messages

xtend(ClassicProtocol, {
  Message: Message,
  Parser: Parser.bind(null, ClassicProtocol),
  Strategy: Strategy.bind(null, ClassicProtocol),
  Flash: Flash.bind(null, ClassicProtocol),
  Program: Program
})

module.exports = ClassicProtocol
