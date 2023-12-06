var debug = require('debug')('cubelets:firmwareService')
var util = require('util')
var request = require('request')
var config = require('../config.json')

function FirmwareService() {
  var info = {}
  var baseUrl = config['urls']['firmware']
  var service = this

  function urlForDownload(mcuTypeId, version, blockTypeId) {
    return baseUrl + '/static/firmware/' + mcuTypeId + '/' + version.major + '.' + version.minor + '/' + pad(blockTypeId) + '.hex'
  }

  function pad(blockTypeId) {
    return (blockTypeId < 10 ? '0' + blockTypeId : blockTypeId)
  }

  this.downloadVersion = function (block, version, callback) {
    var mcuTypeId = block.getMCUType().typeId
    var blockTypeId = block.getBlockType().typeId
    var url = urlForDownload(mcuTypeId, version, blockTypeId)
    debug(url)
    request.get({ url: url }, function (err, response, body) {
      if (err) {
        if (callback) {
          callback(err)
        }
      } else if (response.statusCode !== 200) {
        if (callback) {
          callback(new Error('Bad response. Error status code.'))
        }
      } else {
        var hex = body
        if (callback) {
          callback(null, hex)
        }
      }
    })
  }

  function urlForUpdate() {
    return baseUrl + '/api/code.json'
  }

  this.updateVersion = function (block, version, callback) {
    var url = urlForUpdate()
    debug(url)
    request.post({
      url: url,
      form: {
        'is_default': '1',
        'block_id': block.getBlockId()
      }
    }, function (err, response, body) {
      if (err) {
        if (callback) {
          callback(err)
        }
      } else if (response.statusCode !== 200) {
        if (callback) {
          callback(new Error('Bad response. Error status code.'))
        }
      } else {
        if (callback) {
          callback(null)
        }
      }
    })
  }

}

module.exports = FirmwareService
