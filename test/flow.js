var fs = require('fs')
var test = require('tape')
var device = require('./config').device
var cubelets = require('../index')()
var Protocol = cubelets.Protocol

var outputFile = fs.openSync(__dirname + '/flow.bin', 'w')

test.only('echo flood', function (t)  {
  var n = 500

  t.plan(1 * n + 1)

  var client = cubelets.connect(device, function (err) {
    if (err) {
      t.end(err)
    } else {
      var buffers = []
      for (var i = 0; i < n; ++i) {
        buffers.push(new Protocol.messages.EchoRequest(new Buffer([
          i,i,i,i, i,i,i, i, i,i,i, i, i,i,i, i
        ])).encode())
      }
      var data = Buffer.concat(buffers)
      var x = 0
      client.on('response', function listener(response) {
        var payload = response.echo.readUInt8(0)
        console.log('x =', payload)
        ++x
        t.pass('response ' + x)
        if (x === n) {
          client.disconnect(t.error) // +1
        }
      })
      client.on('error', function (err) {
        console.error(err)
        client.disconnect()
        t.end()
      })
      client.sendData(data, function (err) {
        if (err) {
          client.disconnect()
        }
      })
    }
  })
})

test('config flood', function (t) {
  var n = 5000

  t.plan(n + 1)

  var client = cubelets.connect(device, function (err) {
    if (err) {
      t.end(err)
    } else {
      console.time('time elapsed')
      var buffers = []
      for (var i = 0; i < n; ++i) {
        buffers.push(new Protocol.messages.GetConfigurationRequest().encode())
      }
      var data = Buffer.concat(buffers)
      var x = 0
      client.on('data', function (data) {
        fs.writeSync(outputFile, data, 0, data.length)
      })
      client.on('response', function listener(response) {
        ++x
        t.pass('response ' + x)
        if (x === n) {
          client.disconnect(t.ifError) // +1
          console.timeEnd('time elapsed')
        }
      })
      client.on('error', function (err) {
        console.error(err)
        client.disconnect()
        t.end()
      })

      client.sendData(data, function (err) {
        if (err) {
          client.disconnect()
        }
      })
    }
  })
})
