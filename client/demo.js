var util = require('util')
var through = require('through2')
var Scanner = require('../scanner')
var Connection = require('../connection')
var Client = require('../client')
var Demo = require('../demo')
var xtend = require('xtend')

function delay() {
  return 10
}

var DemoScanner = function () {
  Scanner.call(this)

  this._getDevices = function (callback) {
    setTimeout(function () {
      callback([{
        name: 'Cubelet-RGB',
        deviceId: 1337
      }, {
        name: 'Cubelet-CWM',
        deviceId: 42,
        classic: true
      }])
    }, delay())
  }
}

util.inherits(DemoScanner, Scanner)

var DemoConnection = function (device, opts) {
  Connection.call(this, device, opts)
  
  var stream = this
  var demo, transform
  var isOpen = false

  this.getDemo = function () {
    return demo
  }

  this._read = function (n) {
    // do nothing
  }

  this._write = function (chunk, enc, next) {
    if (demo) {
      transform.push(chunk)
      next()
    }
  }

  this._open = function (callback) {
    if (demo) {
      if (callback) {
        callback(null)
      }
    } else {
      transform = through(function (chunk, enc, next) {
        stream.push(chunk)
        next()
      })

      demo = new Demo(transform, {
        classic: device.classic
      })

      demo.on('error', function (err) {
        stream.emit('error', err)
      })

      demo.on('end', function () {
        isOpen = false
        stream.close()
      })

      setTimeout(function () {
        if (callback) {
          callback(null)
        }
      }, delay())
    }
  }

  this._close = function (callback) {
    if (!demo) {
      if (callback) {
        callback(null)
      }
    } else {
      var d = demo
      demo = null
      d.removeAllListeners('error')
      d.removeAllListeners('data')
      d.removeAllListeners('end')
      if (isOpen) {
        d.end()
      }
      isOpen = false
      d = null
      setTimeout(function () {
        if (callback) {
          callback(null)
        }
      }, delay())
    }
  }
}

util.inherits(DemoConnection, Connection)

module.exports = Client(new DemoScanner(), DemoConnection)
