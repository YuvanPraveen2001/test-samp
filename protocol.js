var util = require('util')
var assert = require('assert')

module.exports = function Protocol(messages) {
  assert(messages)
  assert(Array.isArray(messages.commands))
  assert(Array.isArray(messages.requests))
  assert(Array.isArray(messages.responses))
  assert(Array.isArray(messages.events))

  var commands = messages.commands
  var requests = messages.requests
  var responses = messages.responses
  var events = messages.events

  assert.equal(requests.length, responses.length)

  messages = [].concat(commands)
    .concat(requests)
    .concat(responses)
    .concat(events)

  messages.forEach(stamp)

  function stamp(message) {
    // Runtime action that "stamps" a code onto the
    // message type's constructor
    type(message).prototype.constructor.code = code(message)
  }

  function code(message) {
    return message[0]
  }

  function type(message) {
    return message[1]
  }

  // Form relationships between requests and responses
  var relations = new Bimap(requests.map(function (request, i) {
    return [ code(request), code(responses[i]) ]
  }))

  this.responseCodeForRequestCode = function (code) {
    return relations.left[code]
  }

  this.requestCodeForResponseCode = function (code) {
    return relations.right[code]
  }

  // Map message codes and types bi-directionally for fast lookups
  commands = new Bimap(commands)
  requests = new Bimap(requests)
  responses = new Bimap(responses)
  events = new Bimap(events)

  this.clientTypeForCode = function (code) {
    return events.left[code] || responses.left[code]
  }

  this.serverTypeForCode = function (code) {
    return commands.left[code] || requests.left[code]
  }

  this.typeForCode = function (code) {
    return this.clientTypeForCode(code) || this.serverTypeForCode(code)
  }

  this.isCommand = function (message) {
    return !!commands.left[message.code()]
  }

  this.isRequest = function (message) {
    return !!requests.left[message.code()]
  }

  this.isResponse = function (message) {
    return !!responses.left[message.code()]
  }

  this.isEvent = function (message) {
    return !!events.left[message.code()]
  }
}

function Bimap(relations) {
  assert(Array.isArray(relations))

  var left = {}
  var right = {}

  function x(rel) {
    return rel[0]
  }

  function y(rel) {
    return rel[1]
  }

  relations.forEach(function (rel) {
    assert(Array.isArray(rel))
    left[x(rel)] = y(rel)
    right[y(rel)] = x(rel)
  })

  this.left = left
  this.right = right
}
