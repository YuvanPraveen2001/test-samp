var util = require('util')
var events = require('events')
var __ = require('underscore')

function Scanner () {
  events.EventEmitter.call(this)

  var self = this

  this._devices = []

  this.add = function (device) {
    if (self._add(device)) {
      self.emit('add', device)
    }
  }

  this._add = function (device) {
    var devices = self._devices
    var i = __(devices).findIndex(function (d) {
      return self._compareDevice(d, device)
    })
    if (i === -1) {
      devices.push(device)
      return true
    }
    return false
  }

  this.remove = function (device) {
    if (self._remove(device)) {
      self.emit('remove', device)
    }
  }

  this._remove = function (device) {
    var devices = self._devices
    var i = __(devices).findIndex(function (d) {
      return self._compareDevice(d, device)
    })
    if (i > -1) {
      devices.splice(i, 1)
      return true
    }
    return false
  }

  this._scanning = false

  this.startDeviceScan = function (callback) {
    self._scanning = true
    if (callback) {
      callback(null)
    }
  }

  this.getDevices = function (callback) {
    var devices = self._devices
    self._getDevices(function (newDevices) {
      __(devices)
        .chain()
        .filter(function (device) {
          return __(newDevices).find(function (newDevice) {
            return self._compareDevice(newDevice, device)
          })
        })
        .each(self.remove)
      __(newDevices)
        .each(self.add)
      if (callback) {
        callback(newDevices)
      }
    })
  }

  this._getDevices = function (callback) {
    throw new Error('not implemented')
  }

  this._compareDevice = function (device, otherDevice) {
    return device == otherDevice
  }

  this.stopDeviceScan = function () {
    this._scanning = false
  }
}

util.inherits(Scanner, events.EventEmitter)
module.exports = Scanner
