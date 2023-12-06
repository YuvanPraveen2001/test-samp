var util = require('util')
var events = require('events')
var request = require('request')
var config = require('../config.json')
var __ = require('underscore')

function BuildKitService () {
  events.EventEmitter.call(this)

  var service = this
  var baseUrl = config['urls']['kit']

  service.buildKit = function (blocks, callback) {
    var requestUrl = baseUrl + '/api/kit_add/'
    var ids = []

    __.each(blocks, function (block) {
      ids.push(block.getBlockId())
    })

    var idString = ids.join()
    request.post({
      url: requestUrl,
      json: true,
      form: { 'ids': idString }
    }, function (err, res, body) {
      if (err) {
        callback(err)
      }
      if (body.indexOf('Failed') > -1) {
        callback(new Error(body))
      } else {
        callback(null, parseInt(body, 10))
      }
    })
  }
}

util.inherits(BuildKitService, events.EventEmitter)
module.exports = BuildKitService
