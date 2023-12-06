var test = require('tape')
var device = require('./config').device
var cubelets = require('../index')()

var fromBootloader = false

test('listening', function (t) {
  t.plan(2)

  var client = cubelets.connect(device, function (err) {
    t.ifError(err, 'no connect err')
    t.pass('connected')
    client.getConnection().on('data', function (data) {
      console.log('>>', data)
    })
    if (fromBootloader) {
      client.getConnection().write(new Buffer([
        'L'.charCodeAt(0)
      ]))
    }
  })
})
