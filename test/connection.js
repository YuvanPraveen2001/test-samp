var test = require('tape')
var device = require('./config').device
var cubelets = require('../index')()

test('connecting', function (t) {
  t.plan(6)

  var client = cubelets.connect(device, function (err, con) {
    t.ifError(err, 'no err on connect')
    t.pass('connect callback')

    client.on('connect', function (c) {
      t.equal(con, c)
      t.pass('client connect')
    })

    client.on('disconnect', function () {
      t.pass('client disconnect')
    })

    client.disconnect(function (err) {
      t.ifError(err, 'no err on disconnect')
    })
  })
})
