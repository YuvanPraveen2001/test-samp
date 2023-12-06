var test = require('tape')
var config = require('../config')
var cubelets = require('../../index')()
var BootstrapProtocol = require('../../protocol/bootstrap')
var ClassicProtocol = require('../../protocol/classic')
var ImagoProtocol = require('../../protocol/imago')

var client = cubelets.connect(config.device, function (err) {
  test('connected', function (t) {
    t.plan(1)
    if (err) {
      t.end(err)
    } else {
      t.pass('connected')

      test('jump to bootloader from bootstrap', function (t) {
        t.plan(3)
        client.setProtocol(BootstrapProtocol)
        var req = new BootstrapProtocol.messages.SetBootstrapModeRequest(1)
        client.sendRequest(req, function (err, res) {
          t.ifError(err)
          t.equal(res.mode, 1, 'jumped to imago')
          client.setProtocol(ImagoProtocol)
          var req = new ImagoProtocol.messages.SetModeRequest(0)
          client.sendRequest(req, function (err, res) {
            t.pass()
          })
        })
      })

      test.skip('jump to bootloader from classic', function (t) {
        t.plan(1)
        client.sendData(new Buffer(['L'.charCodeAt(0)]), function (err) {
          t.ifError(err)
        })
      })

      test.skip('jump to bootloader from imago', function (t) {
        t.plan(1)
        client.setProtocol(ImagoProtocol)
        var req = new ImagoProtocol.messages.SetModeRequest(0)
        client.sendRequest(req, function (err, res) {
        }, 200)
        t.pass()
      })
      test('disconnect', function (t) {
        t.plan(1)
        client.disconnect(t.ifError)
      })
    }
  })
})
