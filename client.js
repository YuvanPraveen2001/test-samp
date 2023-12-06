var debug = require('debug')('cubelets:client')
var util = require('util')
var events = require('events')
var xtend = require('xtend/mutable')
var CommandQueue = require('./commandQueue')
var RequestQueue = require('./requestQueue')
var MemoryLock = require('memory-lock');

var Protocols = {
  Imago: require('./protocol/imago'),
  Classic: require('./protocol/classic'),
  Bootstrap: require('./protocol/bootstrap')
}

Protocols.OS4 = Protocols.Imago
Protocols.OS3 = Protocols.Classic

function Factory(Scanner, Connection) {

  function Client (con) {
    events.EventEmitter.call(this)

    var client = this
    this.lock = MemoryLock();

    client._defaultTimeout = 5000

    this.setDefaultTimeout = function (t) {
      client._defaultTimeout = t
    }

    this.getDefaultTimeout = function () {
      return client._defaultTimeout
    }

    this.getConnection = function () {
      return con
    }

    this.getDevice = function () {
      return con.getDevice()
    }

    this.connect = function (callback) {
      con.open(callback)
    }

    this.isConnected = function () {
      return con.isOpen()
    }

    this.disconnect = function (callback) {
      con.close(callback)
    }

    con.on('open', function () {
      client.emit('connect')
      debug('connect')
    })

    con.on('data', function (data) {
      parser.parse(data)
    })

    con.on('close', function (err) {
      client.emit('disconnect', err)
      debug('disconnect')
    })

    con.on('error', function(err)
    {
    	client.emit('disconnect', err)
    })

    var protocol, parser, strategy

    this.setProtocol = function (newProtocol) {
      if (newProtocol !== protocol) {
        protocol = newProtocol
        debug('protocol', getProtocolName())
        setParser(new protocol.Parser())
        setStrategy(new protocol.Strategy(client))
      }
    }

    function getProtocolName() {
      return (
        (protocol === Protocols.Imago) ? 'imago' :
        (protocol === Protocols.Classic) ? 'classic' :
        (protocol === Protocols.Bootstrap) ? 'bootstrap' :
          'unknown'
      )
    }

    function setParser(newParser) {
      if (parser) {
        parser.removeAllListeners('message')
      }
      parser = newParser
      parser.on('message', function (message) {
        if (protocol.isEvent(message)) {
          client.emit('event', message)
          strategy.handleEvent(message)
        }
        if (protocol.isResponse(message)) {
          client.emit('response', message)
        }
      })
    }

    function setStrategy(newStrategy) {
      strategy = newStrategy
      xtend(client, strategy)
    }

    this.getProtocol = function () {
      return protocol
    }

    this.getParser = function () {
      return parser
    }

    this.getStrategy = function () {
      return strategy
    }

    this.sendData = function (data, callback) {
      con.write(data, callback)
    }

    this.sendMessage = function (message) {
      //If someone has locked writes, don't send a message of command.
      if(client.checkIfWriteLocked()){
        debug("Blocked sending of message due to write lock already aquired.")
        return
      }
      client.sendData(message.encode())
    }

    var commandQueue = new CommandQueue(client, (1000 / 20))

    this.sendCommand = function (command) {
      commandQueue.push(command)
    }

    var requestQueue = new RequestQueue(client)

    this.sendRequest = function (request, callback, timeout) {
      requestQueue.push(request, callback, timeout)
    }

    this.setProtocol(Protocols.Imago)

    this.obtainWriteLock = function(){
      if(client.lock.hasWriteLock){
        return false
      }
      return client.lock.writeLock(-1, function(){});
    }
    this.checkIfWriteLocked = function(){
      return client.lock.hasWriteLock
    }
    this.releaseWriteLock = function(){
      return client.lock.writeUnlock()
    }

    return this
  }

  util.inherits(Client, events.EventEmitter)

  xtend(Client, Scanner)

  Client.Protocol = Protocols.Imago
  xtend(Client.Protocol, Protocols)

  Client.createClient = function (device) {
    return new Client(new Connection(device))
  }

  Client.connect = function (device, callback) {
    var client = Client.createClient(device)
    client.connect(callback)
    return client
  }

  return Client

}

module.exports = Factory
