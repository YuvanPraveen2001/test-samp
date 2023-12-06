var redtape = require('redtape')
var cubelets = require('../index')()
var device = require('./config').device

var test = redtape(function before(cb) {
  var client = cubelets.connect(device, function (err) {
    if (err) {
      cb(err)
    } else {
      cb(null, client)
    }
  })
}, function after(client, cb) {
  client.disconnect(cb)
})

test('construction', function (t, client) {
  t.plan(3)

  var map = client.getBlockMap()

  map.on('addBlock', function listener(block) {
    map.removeListener('addBlock', listener)
    t.pass('added cubelet')
  })

  map.on('removeBlock', function listener(added, removed) {
    map.removeListener('updateBlockMap', listener)
    t.pass('removed cubelet')
  })

  client.getBlocks(function (err) {
    if (err) {
      t.fail(err)
      client.disconnect()
    }
  })
})
