var test = require('tape')
var fs = require('fs')
var config = require('../config')
var cubelets = require('../../index')()
var BootstrapProtocol = require('../../protocol/bootstrap')
var ClassicProtocol = require('../../protocol/classic')
var ImagoProtocol = require('../../protocol/imago')
var Upgrade = require('../../upgrade')

var client = cubelets.connect(config.device, function (err) {
  test('connected', function (t) {
    t.plan(1)
    if (err) {
      t.end(err)
    } else {
      t.pass('connected')

      var upgrade = new Upgrade(client)

      // Note: If you need to jump into bootstrap from bootloader
      // then run this test instead of skipping it.
      test.skip('force into bootstrap from bootloader', function (t) {
        t.plan(1)
        client.getConnection().write(new Buffer(['L'.charCodeAt(0)]))
        setTimeout(function () {
          t.pass('force')
        }, 1000)
      })

      test('detect bootstrap', function (t) {
        t.plan(3)
        upgrade.detectIfNeeded(function (err, needsUpgrade, firmwareType) {
          t.ifError(err, 'no err')
          t.ok(needsUpgrade, 'needs upgrade')
          t.equal(client.getProtocol(), BootstrapProtocol, 'has bootstrap firmware')
        })
      })

      test('discovery mode', function (t) {
        t.plan(1)
        client.setProtocol(BootstrapProtocol)
        var timer = setTimeout(function () {
          client.removeListener('event', waitForBlockEvent)
          t.fail('no block found events')
        }, 1000)
        function waitForBlockEvent (e) {
          if (e instanceof BootstrapProtocol.messages.BlockFoundEvent) {
            clearTimeout(timer)
            client.removeListener('event', waitForBlockEvent)
            t.pass('got a block found event')
          }
        }
        client.on('event', waitForBlockEvent)
      })

      // Specify how many times you want to run the jump tests.
      repeatJumps(10)

      function repeatJumps (attempts) {
        for (var i = 0; i < attempts; i++) {
          test('jump to os4 and back to discovery', function (t) {
            t.plan(3)
            client.setProtocol(BootstrapProtocol)
            client.sendRequest(new BootstrapProtocol.messages.SetBootstrapModeRequest(1), function (err, response) {
              t.ifError(err)
              t.equals(response.mode, 1, 'jumped to os4')
              client.setProtocol(ImagoProtocol)
              client.sendCommand(new ImagoProtocol.messages.ResetCommand())
              setTimeout(function () {
                client.setProtocol(BootstrapProtocol)
                var timer = setTimeout(function () {
                  client.removeListener('event', waitForBlockEvent)
                  t.fail('no block found events')
                }, 3000)
                function waitForBlockEvent (e) {
                  if (e instanceof BootstrapProtocol.messages.BlockFoundEvent) {
                    clearTimeout(timer)
                    client.removeListener('event', waitForBlockEvent)
                    t.pass('jumped back to discovery')
                  }
                }
                client.on('event', waitForBlockEvent)
              }, 500)
            })
          })

          test('jump to os3 and back to discovery', function (t) {
            t.plan(3)
            client.setProtocol(BootstrapProtocol)
            client.sendRequest(new BootstrapProtocol.messages.SetBootstrapModeRequest(0), function (err, response) {
              t.ifError(err)
              t.equals(response.mode, 0, 'jumped to os3')
              client.setProtocol(ClassicProtocol)
              client.sendCommand(new ClassicProtocol.messages.ResetCommand())
              setTimeout(function () {
                client.setProtocol(BootstrapProtocol)
                var timer = setTimeout(function () {
                  client.removeListener('event', waitForBlockEvent)
                  t.fail('no block found events')
                }, 3000)
                function waitForBlockEvent (e) {
                  if (e instanceof BootstrapProtocol.messages.BlockFoundEvent) {
                    clearTimeout(timer)
                    client.removeListener('event', waitForBlockEvent)
                    t.pass('jumped back to discovery')
                  }
                }
                client.on('event', waitForBlockEvent)
              }, 500)
            })
          })
        }
      }

      test('disconnect', function (t) {
        t.plan(1)
        client.disconnect(t.ifError)
      })
    }
  })
})
