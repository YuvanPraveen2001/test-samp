var util = require('util')
const { Duplex } = require('node:stream');

var Connection = function (device, opts) {
  Duplex.call(this, opts)

  var self = this
  var isOpen = false

  this.isOpen = function () {
    return isOpen
  }

  this.open = function (callback) {
    if (isOpen) {
      if (callback) {
        callback(null)
      }
    } else {
      self._open(function (err) {
        if (err) {
          if (callback) {
            callback(err)
          }
          self.emit('error', err)
        } else {
          isOpen = true
          if (callback) {
            callback(null)
          }
          self.emit('open')
        }
      })
    }
  }

  this._open = function (callback) {
    throw new Error('not implemented')
  }

  this.close = function (callback) {
    if (!isOpen) {
      if (callback) {
        callback(null)
      }
    } else {
      isOpen = false
      self._close(function (err) {
        if (err) {
          if (callback) {
            callback(err)
          }
          self.emit('error', err)
        } else {
          if (callback) {
            callback(null)
          }
          self.emit('close')
        }
      })
    }
  }

  this._close = function (callback) {
    throw new Error('not implemented')
  }

  this.getDevice = function () {
    return device
  }
}

util.inherits(Connection, Duplex)

module.exports = Connection
