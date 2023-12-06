var Protocol = require('../../../protocol')

var messages = {
  SetValueCommand: require('../block/command/setValue'),
  SetLEDCommand: require('../block/command/setLED'),
  GetConfigurationRequest: require('../block/request/getConfiguration'),
  GetConfigurationResponse: require('../block/response/getConfiguration'),
  GetNeighborsRequest: require('../block/request/getNeighbors'),
  GetNeighborsResponse: require('../block/response/getNeighbors'),
  PingRequest: require('../block/request/ping'),
  PongResponse: require('../block/response/pong'),
  SetModeRequest: require('../block/request/setMode'),
  SetModeResponse: require('../block/response/setMode'),
  JumpCommand: require('../block/command/jump'),
}

module.exports = new Protocol({
  commands: [
    [0x70, messages.SetValueCommand],
    [0x71, messages.SetLEDCommand],
    [0x80, messages.JumpCommand],
  ],
  requests: [
    [0xA0, messages.GetConfigurationRequest],
    [0xA2, messages.GetNeighborsRequest],
    [0xA4, messages.PingRequest],
    [0xA8, messages.SetModeRequest],
  ],
  responses: [
    [0xA1, messages.GetConfigurationResponse],
    [0xA3, messages.GetNeighborsResponse],
    [0xA5, messages.PongResponse],
    [0xAA, messages.SetModeResponse],
  ],
  events: []
})

module.exports.messages = messages
