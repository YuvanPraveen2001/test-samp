var __ = require('underscore')

function Kit () {
  this.verifyKit = function (expectedKit, blocks, callback) {
    var extraBlocks = []
    var missingBlocks = []
    __.each(blocks, function (block) {
      var i = __.findIndex(expectedKit.blockTypes, function (type) {
        return type.typeId === block.getBlockType().typeId
      })

      if (i > -1) {
        expectedKit.blockTypes.splice(i, 1)
      } else {
        extraBlocks.push(block.getBlockType())
      }
    })
    missingBlocks = expectedKit.blockTypes
    var isValid = (missingBlocks.length === 0 && extraBlocks.length === 0)

    callback(isValid, missingBlocks, extraBlocks)
  }
}

module.exports = Kit
