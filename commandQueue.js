var __ = require('underscore')

module.exports = function CommandQueue(client, rate) {

  var commands = []
  var queue = null

  function startQueue() {
    if (queue) {
      return
    }
    queue = setInterval(function () {
      if (commands.length > 0) {
        var cmd = commands.pop()
        client.sendMessage(cmd)
        client.emit('command', cmd)
      } else {
        stopQueue()
      }
    }, rate)
  }

  function stopQueue() {
    if (!queue) {
      return
    }
    clearInterval(queue)
    queue = null
  }

  this.push = function (command) {
    var index = __(commands).findIndex(function (otherCommand) {
      return otherCommand.prioritize(command) > 0
    })
    if (index > -1) {
      commands[index] = command
    } else {
      commands.unshift(command)
    }
    if (!queue) {
      startQueue()
    }
  }

  this.unref = function () {
    stopQueue()
  }

}
