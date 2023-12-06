// Reads in a Buffer with Intel HEX data format
var Program = function (hex, opts) {
  this.valid = false
  this.checksum = { sum: 0, xor: 0 }

  var program = this
  opts = opts || {}

  var formatStartCode = opts.formatStartCode
  var formatByteCount = opts.formatByteCount
  var formatAddress = opts.formatAddress || true
  var formatRecordType = opts.formatRecordType
  var formatData = opts.formatData || true
  var formatEOF = opts.formatEOF
  var formatExtendedSegmentAddress = opts.formatExtendedSegmentAddress
  var formatStartSegmentAddress = opts.formatStartSegmentAddress
  var formatStartLinearAddress = opts.formatStartLinearAddress
  var formatChecksum = opts.formatChecksum
  var formatLineBreak = opts.formatLineBreak

  var useLittleEndian = opts.useLittleEndian || false
  var useLineByteCount = opts.useLineByteCount || 16

  // Decode data
  this.data = (function() {
    var result = []

    // Split on CR or CR+NL
    var lines = hex.toString('ascii').split(/\r?\n/)

    // Set a line count
    program.lineCount = 0

    // Initialize program byte count
    program.byteCount = 0

    // Initialize program data byte count
    program.dataByteCount = 0

    // Generously assume program is valid...
    program.valid = true

    // Reads a byte in the result, and updates the checksum
    function putByte(value) {
      result.push(value)
      program.checksum.xor ^= value
      program.checksum.sum += value
    }

    lines.forEach(function(line) {
      if (line.length == 0) {
        // Skip empty lines
        return
      }

      // Read leading semicolon
      var startCode = line.charAt(0)
      if (startCode != ':') {
        program.valid = false
        console.log('program invalid: line has no leading start code')
        return
      }
      if (formatStartCode) {
        putByte(startCode.charCodeAt(0))
      }

      // Read hex digits
      var digits = line.length - 1
      if (digits % 2 != 0) {
        // Should have an even number of hex digits
        program.valid = false
        console.log('program invalid: line should have an even number of hex digits')
        return
      }

      function readUInt8(i) {
        var hc0 = line[2 * i + 1]
        var hc1 = line[2 * i + 2]
        return parseInt(('' + hc0 + hc1), 16)
      }

      // Add to size based on line header
      var byteCount = readUInt8(0)
      if (useLineByteCount && byteCount !== useLineByteCount) {
        return
      }
      program.byteCount += byteCount
      if (formatByteCount) {
        putByte(byteCount)
      }

      var addressHigh = readUInt8(1)
      var addressLow = readUInt8(2)
      if (formatAddress) {
        putByte(addressHigh)
        putByte(addressLow)
      }

      var recordType = readUInt8(3)
      switch (recordType) {
        // data record
        case 0x00:
          for (var i = 0; i < byteCount; ++i) {
            var dataByte = readUInt8(4 + i)
            if (isNaN(dataByte)) {
              program.valid = false
              console.log('program invalid: could not parse byte', hex)
              return
            }
            program.dataByteCount += 1
            if (formatData) {
              putByte(dataByte)
            }
          }
          break

        case 0x01: // EOF
        case 0x02: // extended segment address
        case 0x03: // start segment address
        case 0x04: // extended linear address
        case 0x05: // start linear address
        default:
          console.log('skipping record type', recordType)
          break
      }

      if (formatLineBreak) {
        putByte(0x0D)
        putByte(0x0A)
      }

      program.lineCount += 1
    })
    return new Buffer.from(result)
  })()
}

module.exports = Program
