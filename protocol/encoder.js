// Encodes a 3-byte ID
module.exports.encodeId = function (value) {
  var data = new Buffer(3)
  data.writeUInt8((value & 0x0000FF), 2)
  data.writeUInt8((value & 0x00FF00) >> 8, 1)
  data.writeUInt8((value & 0xFF0000) >> 16, 0)
  return data
}

module.exports.encodeVersion = function (version) {
  return new Buffer([version.major, version.minor, version.patch])
}
