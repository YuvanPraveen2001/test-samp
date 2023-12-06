/*
Events Emitted
- 'compileStart'
- 'compileWarning'
- 'compileError'
- 'compileFailure'
- 'compileSuccess'
- 'compileConnected'
- 'compileDisconnected'
*/
var debug = require('debug')('cubelets:compileService')
var events = require('events')
var util = require('util');
const COMPILE_TIMEOUT = 30000;

var CompileService = function() {
  events.EventEmitter.call(this);

  this.compileSocket = null;
  this.compileBlock = null;
  this._wasConnected = false;
  this._compileTimeout = null;

  var io = null;
  var compiler = this;

  this.connect = function(_io)
  {
    io = _io;
    if(!io){
      io = require('socket.io-client')
    }

    debug("Attempting to connect to http://compile.modrobotics.com");
    this.compileSocket = io.connect("http://compile.modrobotics.com:80", {
      'reconnect' : true,
      'reconnection delay' : 500,
      'max reconnection attempts' : 'Infinity'
    });
    this.compileSocket.on('compileWarning', this.compileWarningCallback);
    this.compileSocket.on('compileError', this.compileErrorCallback);
    this.compileSocket.on('compileFailure', this.compileFailureCallback);
    this.compileSocket.on('compileSuccess', this.compileSuccessCallback);
    this.compileSocket.on('connect', this.compileSocketOnConnect);
    this.compileSocket.on('disconnect', this.compileSocketOnDisconnect)
    this.compileSocket.on('connecting', function(){
      debug("connecting to compile service")
    })
    this.compileSocket.on('connect_failed', function(){
      debug("connecting failed")
    })
  };

  this.disconnect = function()
  {
    this._wasConnected = false;
    this.compileSocket.disconnect()
  };
  this.compile = function(block, code) {
    var _flags = {
      version : "master", //TODO
      blockType : block.getBlockType().typeId,
      blockTypeString : block.getBlockType().name
    }
    if (compiler.isConnected()) {
      compiler._compileTimeout = setTimeout(function(){
        compileErrorCallback(new Error("Compilation timed out."))
      }, COMPILE_TIMEOUT);
      this.compileBlock = block
      compiler.compileSocket.emit('compileRequest', {
        platform : 'os4',
        flags : _flags,
        source : code
      });
      //Emit compile start
      this.emit('compileStart')
    }
    else{
      compiler.emit('compileSerivceError', { "message": "The compiler is disconnected."})
      function compileRetry(){
        compiler.compile(block, code)
      }
      this.compileSocket.once('connect', compileRetry);
    }
  };
  this.isConnected = function()
  {
    return compiler.compileSocket ? compiler.compileSocket.socket.connected : false;
  }
  this.wasConnected = function(){
    return this._wasConnected;
  }
  this.reconnect = function(){
    this.compileSocket.socket.reconnect();
  }
  this.compileWarningCallback = function(warning)
  {
    debug("W:", warning)
    //Filter out fileName, only show warnings for the users code
    if (warning.fileName.indexOf("cubelet_routines") > -1) {
      compiler.emit('compileWarning', warning)
    }
  };
  this.compileErrorCallback = function(err)
  {
    debug("E:", err)
    compiler.emit('compileError', err)
  };
  this.compileFailureCallback = function(failure)
  {
    clearTimeout(compiler._compileTimeout);
    debug("F:", failure)
    compiler.emit('compileFailure', failure)
  };
  this.compileSocketOnConnect = function(){
    if(!this._wasConnected){
      compiler.emit('compileConnected')
    }
  };
  this.compileSocketOnDisconnect = function(){
    if(this._wasConnected){
      compiler.emit('compileDisconnected')
    }
  };
  this.compileSuccessCallback = function(data)
  {
    clearTimeout(compiler._compileTimeout);
    debug("Compilation success.")
    var computedHash = require('crypto').createHash('md5').update(data.hexBlob).digest('hex')
    if (computedHash !== data.hexBlobHash) {
      //Throw error
      cubeletsFlash.emit('compileFailure', {
        'error' : 'invalid hex received',
        'friendlyMessage' : 'An invalid response was received from the compile service. Please try again.'
      })
      return
    }
    debug("Program Space:", data.stats.programSpace)
    debug("Data Space:", data.stats.dataSpace)
    compiler.emit('compileSuccess', data)
  };
}

util.inherits(CompileService, events.EventEmitter);
module.exports = CompileService;
