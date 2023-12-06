var Decoder = require('../protocol/decoder')

function blockId(b2, b1, b0) {
  return Decoder.decodeId(new Buffer([b2, b1, b0]))
}

function device() {
  return process.browser ? {
    "address": "00:04:3e:31:c7:3e"
  } : {
    "path": "COM63",
    "address": "00:04:3e:31:c7:3e",
    "channelID": 1
  }
}

function map() {
  var type = {
    bluetooth: 174031,
    passive: blockId(3, 2, 1),
    knob: blockId(6, 5, 4),
    distance: blockId(7, 5, 4),
    flashlight: blockId(12, 11, 10),
    bargraph: blockId(13, 14, 14),
    drive: blockId(9, 8, 7)
  }
  return {
    "type": type,
    "hopCount": [[
      type.bluetooth
    ],[
      type.passive,
      type.blocker
    ],[
      type.knob,
      type.bargraph
    ]]
  }
}

module.exports = {
  "device": device(),
  "map": map()
}
