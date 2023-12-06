var async = require('async')

module.exports = function RequestQueue(client) {

  var queue = async.queue(function worker(task, callback) {
    var request = task.request
    var timeout = task.timeout

    var timer = setTimeout(function () {
      client.removeListener('response', waitForResponse)
      if (callback) {
        var code = request.code()
        var err = new Error('Timed out waiting for response to request: ' + code)
        err.friendlyMessage = 'Bluetooth Cubelet is not responding. It may need to be reset.'
        err.code = code
        callback(err)
      }
    }, timeout)

    var protocol = client.getProtocol()

    function waitForResponse(response) {
      if (protocol.requestCodeForResponseCode(response.code()) === request.code()) {
        clearTimeout(timer)
        client.removeListener('response', waitForResponse)
        if (callback) {
          callback(null, response)
        }
      }
    }

    client.on('response', waitForResponse)
    client.sendMessage(request)
    client.emit('request', request)
  })

  this.push = function (request, callback, timeout) {
    queue.push({
      request: request,
      timeout: timeout || client._defaultTimeout
    }, callback)
  }
}
