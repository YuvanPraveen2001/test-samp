var debug = require('debug')('cubelets:infoService')
var util = require('util')
var events = require('events')
var config = require('../../config.json')
var Version = require('../../version')
var __ = require('underscore')

var Info = function (data) {
  this.blockTypeId = parseInt(data['type_id'], 10)
  this.mcuTypeId = data['mcu']
  this.currentFirmwareVersion = parseVersion(data['current_firm_ver'])
  this.latestFirmwareVersion = parseVersion(data['latest_firm_ver'])
}

function InfoService() {
  events.EventEmitter.call(this)

  var service = this
  var baseUrl = config['urls']['info']

  function urlForBlocks(blocks) {
    return baseUrl + '/api/cubelet_info/?ids=' + __(blocks).map(function (block) {
      return block.getBlockId()
    }).join(',')
  }

  this.fetchBlockInfo = function (blocks, callback) {
    if (blocks.length === 0) {
      if (callback) {
        callback(null)
      }
    } else {
      var url = urlForBlocks(blocks)
      debug(url)
      var request = new XMLHttpRequest()
      request.open('GET', url, true)
      request.onreadystatechange = function() {
        if (request.readyState === 4) {
          if (request.status === 200) {
            var body = JSON.parse(request.responseText)
            if (!__(body).isArray()) {
              if (callback) {
                callback(new Error('Invalid response.'))
              }
            } else {
              var infos = []
              __(blocks).each(function (block) {
                __(body).each(function (item) {
                  if (item['id'] === block.getBlockId()) {
                    var info = new Info(item)
                    infos.push(info)
                    service.emit('info', info, block)
                  } else {
                    infos.push(null)
                  }
                })
              })
              if (callback) {
                callback(null, infos)
              }
            }
          } else {
            if (callback) {
              callback(new Error('Cubelets Info Service not available. Check your Internet connection and try again.'))
            }
          }
        }
      }
      request.send()
    }
  }
}

function parseVersion(floatValue) {
  var major = Math.floor(floatValue)
  var minor = Math.floor(10 * (floatValue - major))
  return new Version(major, minor)
}

util.inherits(InfoService, events.EventEmitter)
module.exports = InfoService
