var debug = require('debug')('cubelets:parser')
var events = require('events')
var util = require('util')

var Parser = function (protocol) {
  var self = this
  events.EventEmitter.call(self)

  // Possible parser states
  var State = {
    RAW:0,
    READY:1,
    HEADER_BEGIN:2,
    HEADER_TYPE:3,
    HEADER_SIZE:4,
    HEADER_END:5,
    BODY:6
  }

  // Initialize parser state
  var state = State.READY
  var data = new Buffer(0)
  var code = -1
  var type = undefined
  var size = 0
  var index = 0
  var extraBytes = []

  this.setRawMode = function (raw) {
    process.nextTick(function () {
      state = raw ? State.RAW : State.READY
      data = new Buffer(0)
      code = -1
      type = undefined
      size = 0
      index = 0
      extraBytes = []
    })
  }

  this.getRawMode = function () {
    return state === State.RAW
  }

  // Main parse function
  this.parse = function (buffer) {

    data = Buffer.concat([data, buffer])

    function byteAt(i) {
      return data.readUInt8(i)
    }

    function nextByte() {
      return byteAt(index++)
    }

    function nextChar() {
      return String.fromCharCode(nextByte())
    }

    function shouldParse() {
      var bytesToRead = data.length - index
      switch (state) {
        case State.HEADER_END:
          return size === 0 || bytesToRead > 0
        case State.BODY:
          return bytesToRead >= size
        default:
          return bytesToRead > 0
      }
    }

    function reset() {
      state = State.READY
      data = data.slice(index)
      code = -1
      type = undefined
      size = 0
      index = 0
    }

    function parseRaw() {
      if (data.length > 0) {
        emitRaw(data)
      }
      state = State.RAW
      data = new Buffer(0)
      code = -1
      type = undefined
      size = 0
      index = 0
    }

    function parseReady() {
      var c = nextChar()
      if (c == '<') {
        state = State.HEADER_BEGIN
      } else {
        parseExtra()
      }
    }

    function parseHeaderBegin() {
      code = nextByte()
      type = protocol.typeForCode(code)
      state = State.HEADER_TYPE
      if (!type) {
        parseExtra()
      }
    }

    function parseHeaderType() {
      size = nextByte()
      state = State.HEADER_SIZE
    }

    function parseHeaderSize() {
      var c = nextChar()
      if (c == '>') {
        state = State.HEADER_END
      } else {
        parseExtra()
      }
    }

    function parseHeaderEnd() {
      if (size === 0) {
        parseBody()
      } else {
        state = State.BODY
      }
    }

    function parseBody() {
      var body = data.slice(index, index + size)
      emitMessage(body)
      index += size
      reset()
    }

    function parseExtra() {
      for (var i = 0; i < index; ++i) {
        extraBytes.push(byteAt(i))
      }
      reset()
    }

    process.nextTick(function () {
      while (shouldParse()) {
        switch (state) {
          case State.RAW:
            parseRaw()
            break
          case State.READY:
            parseReady()
            break
          case State.HEADER_BEGIN:
            parseHeaderBegin()
            break
          case State.HEADER_TYPE:
            parseHeaderType()
            break
          case State.HEADER_SIZE:
            parseHeaderSize()
            break
          case State.HEADER_END:
            parseHeaderEnd()
            break
          case State.BODY:
            parseBody()
            break
        }
      }

      if (extraBytes.length > 0) {
        emitExtra(new Buffer(extraBytes))
        extraBytes = []
      }
    })
  }

  // Emits a parsed response
  var emitMessage = function (body) {
    var message = new type()
    message.decodeBody(body)
    process.nextTick(function () {
      self.emit('message', message)
      debug('message', message)
    })
  }

  // Emits extra data
  var emitExtra = function (data) {
    process.nextTick(function () {
      self.emit('extra', data)
      debug('extra', data)
    })
  }

  // Emits raw data
  var emitRaw = function (data) {
    process.nextTick(function () {
      self.emit('raw', data)
      debug('raw', data)
    })
  }
}

util.inherits(Parser, events.EventEmitter)
module.exports = Parser
