var net = require('net')

function NetServer(Connection) {

  return {
    createServer: function (callback) {
      return net.createServer(function (socket) {
        callback(new Connection(socket))
      })
    }
  }

}

module.exports = NetServer
