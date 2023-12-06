var test = require('tape')
var util = require('util')
var fs = require('fs')
var __ = require('underscore')

var config = require('./config')
var cubelets = require('../index')()
var Protocol = cubelets.Protocol
var ImagoProtocol = require('../protocol/imago')
var ImagoProgram = ImagoProtocol.Program
var ImagoFlash = ImagoProtocol.Flash
var Block = cubelets.Block
var BlockTypes = cubelets.BlockTypes
var Version = cubelets.Version
var Program = Protocol.Program
var MCUTypes = require('../mcuTypes')

var blockId = 162342
var blockType = BlockTypes.BARGRAPH
var block;

var client = cubelets.connect(config.device, function (err) {
  test('connected', function (t) {
    t.plan(1)
    if (err) {
      t.end(err)
    } else {
      t.pass('connected')

      test('target block ' + blockId + ' exists', function (t) {
        t.plan(3)
        client.sendRequest(new Protocol.messages.GetAllBlocksRequest(), function (err, response) {
          t.ifError(err, 'no blocks response err')
          t.ok(response, 'blocks response ok')
          console.log('blocks', response.blocks)
          var target = __(response.blocks).find(function (block) {
            return block.blockId === blockId
          })
          block = new Block(target.blockId, target.hopCount, Block.blockTypeForId(target.blockTypeId));
          block._mcuType = MCUTypes.PIC
          t.ok(target, 'found target')
        })
      })

      test('can flash a ' + blockType.name + ' hex', function (t) {
        t.plan(3)

        // check the program is valid
        var hex = fs.readFileSync('./upgrade/hex/application/' + blockType.name + '.hex')
        var program = new ImagoProgram(hex)
        t.ok(program.valid, 'program valid')

        var flash = new ImagoFlash(client)

        flash.on('progress', function(e) {
							console.log('progress', '(' + e.progress + '/' + e.total + ')')
				})

				flash.programToBlock(program, block, function(err) {
							t.notOk(err, err);
							t.pass("Flashed program")

					})
      })

      test('disconnect', function (t) {
        t.plan(1)
        client.disconnect()
        t.pass()
      })

    }
  })
})
