var BlockTypes = require('./blockTypes')
var MCUTypes = require('./mcuTypes')
var Version = require('./version')
var __ = require('underscore')

var Block = function (blockId, hopCount, blockType, mcuType) {
  var _blockId = blockId

  // Protected values, updated by the client as it
  // receives more information about the block.
  this._hopCount = hopCount
  this._blockType = blockType || BlockTypes.UNKNOWN
  this._mcuType = mcuType || MCUTypes.UNKNOWN
  this._neighbors = {}
  this._faceIndex = -1
  this._value = 0
  this._valueOverridden = false
  this._hardwareVersion = new Version()
  this._bootloaderVersion = new Version()
  this._applicationVersion = new Version()

  // Returns the ID of the block.
  this.getBlockId = function () {
    return _blockId
  }

  // Returns the block's hop count from the origin block.
  this.getHopCount = function () {
    return this._hopCount
  }

  // Returns the `BlockType` of the block, e.g. BATTERY, DRIVE, DISTANCE, etc.
  this.getBlockType = function () {
    return this._blockType
  }

  // Returns the `MCUType` of the block, e.g. AVR, PIC
  this.getMCUType = function () {
    return this._mcuType
  }

  // Returns a dictionary with the neighboring
  // face numbers as keys, and blockIds as values.
  this.getNeighbors = function () {
    return this._neighbors
  }

  // Returns the face index of the block, if known,
  // that routes back to the host block.
  this.getFaceIndex = function () {
    return this._faceIndex
  }

  // Returns the 8-bit value of the block, either
  // from a value overridden by the client,
  // or the natural cubelet block value determined by
  // the construction.
  this.getValue = function () {
    return this._value
  }

  // Returns true if the value is overridden by
  // the client, or false otherwise.
  this.isValueOverridden = function () {
    return this._valueOverridden
  }

  // Returns the hardware version of the block.
  this.getHardwareVersion = function () {
    return this._hardwareVersion
  }

  // Returns the bootloader version of the block.
  this.getBootloaderVersion = function () {
    return this._bootloaderVersion
  }

  // Returns the application version of the block.
  this.getApplicationVersion = function () {
    return this._applicationVersion
  }

  return this
}

module.exports = Block

module.exports.blockTypeForId = function (typeId) {
  return __(BlockTypes).find(function (type) {
    return type.typeId === typeId
  }) || BlockTypes.UNKNOWN
}

module.exports.mcuTypeForId = function (typeId) {
  return __(MCUTypes).find(function (type) {
    return type.typeId === typeId
  }) || MCUTypes.UNKNOWN
}
