var Protocol = require('../../protocol')
var Message = require('../imago/message')
var Parser = require('../parser')
var xtend = require('xtend/mutable')
var DefaultStrategy = require('../strategy')

var messages = {
  SetBootstrapModeRequest: require('./request/setBootstrapMode'),
  SetBootstrapModeResponse: require('./response/setBootstrapMode'),

  BlockFoundEvent: require('./event/blockFound'),
  DisconnectFailedEvent: require('./event/disconnectFailed'),
  SkipDisconnectEvent: require('./event/skipDisconnect')
}

var BootstrapProtocol = new Protocol({
  commands: [
  ],
  requests: [
    [0xB1, messages.SetBootstrapModeRequest],
  ],
  responses: [
    [0xBF, messages.SetBootstrapModeResponse],
  ],
  events: [
    [0xB0, messages.BlockFoundEvent],
    [0xB2, messages.DisconnectFailedEvent],
    [0xB3, messages.SkipDisconnectEvent]
  ]
})

BootstrapProtocol.messages = messages

xtend(BootstrapProtocol, {
  Message: Message,
  Parser: Parser.bind(null, BootstrapProtocol),
  Strategy: DefaultStrategy.bind(null, BootstrapProtocol)
})

module.exports = BootstrapProtocol
