var express = require('express')
var net = require('net-browserify/api')
var http = require('http')

function HttpServer(Connection) {

  return {
    createServer: function (callback) {
      var httpServer = http.createServer()
      var netServer = net(httpServer, {}, function (socket) {
        callback(new Connection(socket))
      })
      var app = express()
      httpServer.addListener('request', app)
      app.use(function (req, res, next) {
        res.header('Access-Control-Allow-Origin', 'http://localhost:8000')
        res.header('Access-Control-Allow-Credentials', true)
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
        res.header('Access-Control-Allow-Headers', 'Content-Type')
        next()
      })
      app.use(netServer)
      return httpServer
    }
  }

}

module.exports = HttpServer
