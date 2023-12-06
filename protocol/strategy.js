function Strategy(protocol, client) {

  var messages = protocol.messages

  // Sends a packet to the host block, and
  // when a pong response is received,
  // calls the callback with the response.
  this.ping = function (callback) {
    requiredMethod()
  }

  // Starts a keep alive timer that
  // sends a ping packet at the given interval.
  // If a pong is not received within the given timeout,
  // then the client will emit an `error` and a `die` event.
  this.startKeepAliveTimer = function (interval, timeout) {
    client.stopKeepAliveTimer()
    timeout = timeout || client.getDefaultTimeout()
    interval = interval || (2 * timeout)
    client.keepAliveTimer = setInterval(function () {
      client.ping(function (err) {
        if (err) {
          client.stopKeepAliveTimer()
          client.emit('error', new Error('Keep alive timer expired.'))
          client.emit('die')
        }
      }, timeout)
    }, interval)
  }

  // Stops the keepalive timer above.
  // Called automatically for critical priority
  // operations like firmware flashing.
  this.stopKeepAliveTimer = function () {
    if (client.keepAliveTimer) {
      clearInterval(client.keepAliveTimer)
      client.keepAliveTimer = null
    }
  }

  this.echo = function (data, callback) {
    requiredMethod()
  }

  this.getBlockMap = function () {
    requiredMethod()
  }

  this.getOriginBlock = function () {
    return this.getBlockMap().getOriginBlock()
  }

  this.getNeighborBlocks = function () {
    return this.getBlockMap().getNeighborBlocks()
  }

  this.getAllBlocks = function () {
    return this.getBlockMap().getAllBlocks()
  }

  this.getGraph = function () {
    return this.getBlockMap().getGraph()
  }

  this.findBlockById = function (blockId) {
    return this.getBlockMap().findById(blockId)
  }

  this.filterBlocksByHopCount = function (hopCount) {
    return this.getBlockMap().filterByHopCount(hopCount)
  }

  this.getConfiguration = function () {
    requiredMethod()
  }

  this.fetchConfiguration = function (callback) {
    requiredMethod()
  }

  this.fetchOriginBlock = function (callback) {
    requiredMethod()
  }

  this.fetchNeighborBlocks = function (callback) {
    requiredMethod()
  }

  this.fetchAllBlocks = function (callback) {
    requiredMethod()
  }

  this.fetchBlockTypes = function (blocks, callback) {
    requiredMethod()
  }

  this.fetchBlockConfigurations = function (blocks, callback) {
    requiredMethod()
  }

  this.fetchBlockNeighbors = function (blocks, callback) {
    requiredMethod()
  }

  this.fetchGraph = function () {
    requiredMethod()
  }

  this.setBlockValue = function (blockId, value, callback) {
    requiredMethod()
  }

  this.setManyBlockValues = function (blocks, callback) {
    requiredMethod()
  }

  this.clearBlockValue = function (blockId, callback) {
    requiredMethod()
  }

  this.clearManyBlockValues = function (blocks, callback) {
    requiredMethod()
  }

  this.clearAllBlockValues = function (callback) {
    requiredMethod()
  }

  this.registerBlockValueEvent = function (blockId, callback) {
    requiredMethod()
  }

  this.unregisterBlockValueEvent = function (blockId, callback) {
    requiredMethod()
  }

  this.unregisterAllBlockValueEvents = function (callback) {
    requiredMethod()
  }

  this.sendBlockRequest = function (blockRequest, callback, timeout) {
    requiredMethod()
  }

  this.setConnectionInteral = function (min, max, connectionLatency, supervisorTimeout, callback) {
    optionalMethod()
  }

  this.flash = function (options) {
    return new protocol.Flash(client, options)
  }

  this.handleEvent = function (event) {
    optionalMethod()
  }
}

module.exports = Strategy

function optionalMethod() {}
function requiredMethod() { throw new Error('not implemented') }
