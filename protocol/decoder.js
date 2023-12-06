var Version = require('../version')

// Decodes a 3-byte ID
module.exports.decodeId = function (data) {
  if (data.length < 3) {
    return 0
  }
  var value = [
    data.readUInt8(0) * 256 * 256,
    data.readUInt8(1) * 256,
    data.readUInt8(2)
  ];
  return value[2] + value[1] + value[0]
};

// Decodes a version
module.exports.decodeVersion = function (data) {
  return new Version(data[0], data[1], data[2])
}

