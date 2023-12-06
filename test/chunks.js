var test = require('tape')

test('algo', function (t) {
  t.plan(1)

  var dataBytes = []
  for (var i = 0; i < 256 * 10; i++) {
    dataBytes[i] = i % 256
  }

  var data = new Buffer(dataBytes)

  var chunks = []
  var chunkSize = 5

  function writeChunk(i) {
    var start = i * chunkSize
    var end = start + chunkSize
    var chunk = data.slice(start, end)
    if (chunk.length > 0) {
      console.log('chunk', i, chunk)
      chunks.push(chunk)
      writeChunk(i + 1)
    }
  }

  writeChunk(0)

  t.equals(chunks.length, data.length / chunkSize)

})
