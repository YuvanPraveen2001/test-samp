var Protocol = require('../../protocol')
var BlockProtocol = require('./block')
var Message = require('./message')
var Parser = require('../parser')
var Strategy = require('./strategy')
var Program = require('./program')
var Flash = require('./flash')
var xtend = require('xtend/mutable')

var messages = {
  SetBlockValueCommand: require('./command/setBlockValue'),
  ClearBlockValueCommand: require('./command/clearBlockValue'),
  SetLEDColorCommand: require('./command/setLEDColor'),
  SetLEDRGBCommand: require('./command/setLEDRGB'),
  ResetCommand: require('./command/reset'),

  GetConfigurationRequest: require('./request/getConfiguration'),
  GetConfigurationResponse: require('./response/getConfiguration'),
  GetModeRequest: require('./request/getMode'),
  GetModeResponse: require('./response/getMode'),
  SetModeRequest: require('./request/setMode'),
  SetModeResponse: require('./response/setMode'),
  SetCrcsRequest: require('./request/setCrcsEnabled'),
  SetCrcsResponse: require('./response/setCrcsEnabled'),
  SetConnectionIntervalRequest: require('./request/setConnectionInterval'),
  SetConnectionIntervalResponse: require('./response/setConnectionInterval'),
  GetBlockValueRequest: require('./request/getBlockValue'),
  GetBlockValueResponse: require('./response/getBlockValue'),
  SetBlockValueRequest: require('./request/setBlockValue'),
  SetBlockValueResponse: require('./response/setBlockValue'),
  RegisterBlockValueEventRequest: require('./request/registerBlockValueEvent'),
  RegisterBlockValueEventResponse: require('./response/registerBlockValueEvent'),
  UnregisterBlockValueEventRequest: require('./request/unregisterBlockValueEvent'),
  UnregisterBlockValueEventResponse: require('./response/unregisterBlockValueEvent'),
  UnregisterAllBlockValueEventsRequest: require('./request/unregisterAllBlockValueEvents'),
  UnregisterAllBlockValueEventsResponse: require('./response/unregisterAllBlockValueEvents'),
  GetAllBlocksRequest: require('./request/getAllBlocks'),
  GetAllBlocksResponse: require('./response/getAllBlocks'),
  GetNeighborBlocksRequest: require('./request/getNeighborBlocks'),
  GetNeighborBlocksResponse: require('./response/getNeighborBlocks'),
  WriteBlockMessageRequest: require('./request/writeBlockMessage'),
  WriteBlockMessageResponse: require('./response/writeBlockMessage'),
  EchoRequest: require('./request/echo'),
  EchoResponse: require('./response/echo'),
  GetMemoryTableRequest: require('./request/getMemoryTable'),
  GetMemoryTableResponse: require('./response/getMemoryTable'),
  UploadToMemoryRequest: require('./request/uploadToMemory'),
  UploadToMemoryResponse: require('./response/uploadToMemory'),
  FlashMemoryToBlockRequest: require('./request/flashMemoryToBlock'),
  FlashMemoryToBlockResponse: require('./response/flashMemoryToBlock'),

  DebugEvent: require('./event/debug'),
  BlockValueEvent: require('./event/blockValue'),
  BlockAddedEvent: require('./event/blockAdded'),
  BlockRemovedEvent: require('./event/blockRemoved'),
  ReadBlockMessageEvent: require('./event/readBlockMessage'),
  UploadToMemoryCompleteEvent: require('./event/uploadToMemoryComplete'),
  FlashProgressEvent: require('./event/flashProgress'),
  ErrorEvent: require('./event/error'),
}

var ImagoProtocol = new Protocol({
  commands: [
    [0x41, messages.SetBlockValueCommand],
    [0x42, messages.ClearBlockValueCommand],
    [0x43, messages.SetLEDColorCommand],
    [0x44, messages.SetLEDRGBCommand],
    [0x80, messages.ResetCommand],
  ],
  requests: [
    [0x01, messages.GetConfigurationRequest],
    [0x02, messages.GetModeRequest],
    [0x03, messages.SetModeRequest],
    [0x04, messages.GetBlockValueRequest],
    [0x05, messages.SetBlockValueRequest],
    [0x06, messages.RegisterBlockValueEventRequest],
    [0x0A, messages.UnregisterBlockValueEventRequest],
    [0x0B, messages.UnregisterAllBlockValueEventsRequest],
    [0x07, messages.GetAllBlocksRequest],
    [0x08, messages.GetNeighborBlocksRequest],
    [0x09, messages.WriteBlockMessageRequest],
    [0x10, messages.EchoRequest],
    [0x0D, messages.SetCrcsRequest],
    [0x0E, messages.SetConnectionIntervalRequest],
    [0x20, messages.GetMemoryTableRequest],
    [0x21, messages.UploadToMemoryRequest],
    [0x22, messages.FlashMemoryToBlockRequest],
  ],
  responses: [
    [0x81, messages.GetConfigurationResponse],
    [0x82, messages.GetModeResponse],
    [0x83, messages.SetModeResponse],
    [0x84, messages.GetBlockValueResponse],
    [0x85, messages.SetBlockValueResponse],
    [0x86, messages.RegisterBlockValueEventResponse],
    [0x8A, messages.UnregisterBlockValueEventResponse],
    [0x8B, messages.UnregisterAllBlockValueEventsResponse],
    [0x87, messages.GetAllBlocksResponse],
    [0x88, messages.GetNeighborBlocksResponse],
    [0x89, messages.WriteBlockMessageResponse],
    [0x90, messages.EchoResponse],
    [0x8D, messages.SetCrcsResponse],
    [0x8E, messages.SetConnectionIntervalResponse],
    [0xA0, messages.GetMemoryTableResponse],
    [0xA1, messages.UploadToMemoryResponse],
    [0xA2, messages.FlashMemoryToBlockResponse],
  ],
  events: [
    [0xE0, messages.DebugEvent],
    [0xE1, messages.BlockValueEvent],
    [0xE2, messages.ReadBlockMessageEvent],
    [0xE3, messages.UploadToMemoryCompleteEvent],
    [0xE4, messages.FlashProgressEvent],
    [0xE5, messages.BlockAddedEvent],
    [0xE6, messages.BlockRemovedEvent],
    [0xFF, messages.ErrorEvent],
  ]
})

ImagoProtocol.messages = messages

xtend(ImagoProtocol, {
  Message: Message,
  Block: BlockProtocol,
  Parser: Parser.bind(null, ImagoProtocol),
  Strategy: Strategy.bind(null, ImagoProtocol),
  Flash: Flash.bind(null, ImagoProtocol),
  Program: Program
})

module.exports = ImagoProtocol
