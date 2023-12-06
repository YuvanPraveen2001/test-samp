var Encoder = require('../encoder')
var Decoder = require('../decoder')

var Message = function () {
  this.timestamp = (new Date).getTime()
}

Message.prototype.code = function () {
  return this.constructor.code
}

Message.prototype.decodeBody = function (body) {
  return Buffer.isBuffer(body)
}

Message.prototype.encodeHeader = function () {
  return new Buffer([
    this.code()
  ])
}

Message.prototype.encodeBody = function () {
  return new Buffer(0)
}

Message.prototype.encode = function () {
  var header = this.encodeHeader()
  var body = this.encodeBody()
  return Buffer.concat([
    header,
    body
  ])
}

module.exports = Message
module.exports.Encoder = Encoder
module.exports.Decoder = Decoder
