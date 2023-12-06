var fs = require('fs')
var test = require('tape')
var config = require('./config')
var cubelets = require('../index')()

var blockIds = {
  flashlight: config.map.type.flashlight,
  bargraph: config.map.type.bargraph
}

test('connect', function (t) {
  t.plan(1)

  var client = cubelets.connect(config.device, function (err) {
    if (err) {
      t.end(err)
    } else {
      t.pass('connected')

      test('configuration', function (t) {
        t.plan(1)
        client.fetchConfiguration(t.ifError)
      })

      test('register block value events', function (t) {
        t.plan(3)
        client.registerBlockValueEvent(blockIds.flashlight, t.ifError)
        client.registerBlockValueEvent(blockIds.bargraph, t.ifError)
        var timer = setTimeout(function () {
          client.removeListener('event', onEvent)
          t.fail('register')
        }, 2000)
        function onEvent(e) {
          if (e instanceof cubelets.Protocol.messages.BlockValueEvent) {
            console.log('got event', e)
            clearTimeout(timer)
            client.removeListener('event', onEvent)
            t.pass('register')
          }
        }
        client.on('event', onEvent)
      })

      test('unregister block value events', function (t) {
        t.plan(3)
        client.unregisterBlockValueEvent(blockIds.flashlight, t.ifError)
        client.unregisterBlockValueEvent(blockIds.bargraph, t.ifError)
        setTimeout(function () {
          var timer = setTimeout(function () {
            client.removeListener('event', onEvent)
            t.pass('unregister')
          }, 2000)
          function onEvent(e) {
            if (e instanceof cubelets.Protocol.messages.BlockValueEvent) {
              console.log('got event', e)
              clearTimeout(timer)
              client.removeListener('event', onEvent)
              t.fail('unregister')
            }
          }
          client.on('event', onEvent)
        }, 2000)
      })

      test('disconnect', function (t) {
        t.plan(1)
        client.disconnect(t.ifError)
      })
    }
  })
})
