var args = process.argv
if (args.length !== 3) {
  console.log('Usage: node bin/demo PORT')
  process.exit(1)
}

var Demo = require('../demo')
var DemoServer = require('../server/http')(Demo)
var port = parseInt(args[2])
var connection

var server = DemoServer.createServer(function (newConnection) {
  console.log('new client connected')
  connection = newConnection
})

server.listen(port, function () {
  console.log('server listening on port', port)
})

var stdin = process.stdin
stdin.setRawMode(true)
stdin.setEncoding('utf8')
stdin.resume()
stdin.on('data', function (key) {
  switch (key) {
    case '\u0003': // Ctrl+C
      console.log('goodbye.')
      server.close(function () {
        process.exit(0)
      })
      break
    case 'a':
      addBlock()
      break
    case 'r':
      removeBlock()
      break
  }
})

var i = 0
var blocks = []

function createBlock() {
  var blockIds = [
    19808, // passive (avr)
     6766, // knob (avr)
    40834, // drive (pic)
    17474, // flashlight (pic)
    29456, // inverse (pic)
    51404, // distance (pic)
    64451, // battery (pic)
  ]
  var block = {
    blockId: blockIds[i],
    hopCount: 1,
    faceIndex: i
  }
  i = (i + 1 === 6) ? 0 : i + 1
  return block
}

function addBlock() {
  if (blocks.length < 6) {
    var block = createBlock()
    blocks.unshift(block)
    connection.addBlock(block)
  }
}

function removeBlock() {
  if (blocks.length > 0) {
    var block = blocks.pop()
    connection.removeBlock(block)
  }
}
