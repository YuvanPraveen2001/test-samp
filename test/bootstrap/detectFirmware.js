var test = require('tape')
var fs = require('fs')
var config = require('../config')
var cubelets = require('../../index')()
var Upgrade = require('../../upgrade')

var bluetoothBlockId = config.map.type.bluetooth

var client = cubelets.connect(config.device, function (err) {
  test('connected', function (t) {
    t.plan(1)
    if (err) {
      t.end(err)
    } else {
      t.pass('connected')

      var upgrade = new Upgrade(client)

      test('detect upgrade firmware?', function (t) {
        t.plan(2)
        upgrade.detectIfNeeded(function (err, needsUpgrade, firmwareType) {
          t.ifError(err, 'detect ok')
          if (needsUpgrade) {
            console.log('upgrade needed!')
          }
          switch (firmwareType) {
            case 0: t.pass('classic firmware detected.'); break
            case 1: t.pass('imago firmware detected.'); break
            case 2: t.pass('bootstrap firmware detected.'); break
            default: t.fail('unknown firmware'); break
          }
        })
      })

      test('disconnect', function (t) {
        t.plan(1)
        client.disconnect(t.ifError)
      })
    }
  })
})
