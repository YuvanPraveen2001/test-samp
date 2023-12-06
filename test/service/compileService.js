var test = require('tape')
var Block = require('../../block')
var BlockTypes = require('../../blockTypes')
var ImagoProtocol = require('../../protocol/imago')
var ImagoProgram = ImagoProtocol.Program
var CompileService = require('../../services/compile')

var compileService = new CompileService();

test('Connecting', function (t) {
  t.plan(1)
  compileService.once('compileConnected', function(){
    t.pass("Able to establish a connection.")
  });
  compileService.connect();
})

test('compile success', function (t) {
  t.plan(3)

  var code = `
    #include "cubelet.h"
    #include <stdbool.h>

    void setup() {
    }

    void loop() {
    }
  `;

  var block = new Block(167058, 0, BlockTypes.BATTERY)

  compileService.once('compileStart', function(){
    t.pass("Throws an event when compiling starts.")
  });

  compileService.once('compileSuccess', function(data){
    t.pass("Throws an event when compiling succeeds");
    var program = new ImagoProgram(data.hexBlob)
    t.ok(program.valid, "The hex file that is returned is valid")
  });

  compileService.once('compileError', function(data){
    console.log("there was an error")
  });
  compileService.compile(block, code)
})

test('compiler disconnect', function (t) {
  t.plan(2)
  compileService.disconnect();
  t.ok(compileService._wasConnected == false, "Disconnected");
  t.ok(compileService.isConnected() == false, "Disconnected");
})

test('compiler reconnect', function (t) {
  t.plan(1)
  compileService.reconnect();
  compileService.once('compileConnected', function(){
    t.pass("Able to establish a connection.")
  });
})

test('compiler disconnect again', function (t) {
  t.plan(1)
  compileService.disconnect();
  t.ok(!compileService.isConnected(), "Disconnected");
})
