var fs = require('fs')
var test = require('tape')
var cubelets = require('../index')()
var ImagoProgram = require('../protocol/imago/program')
var ClassicProgram = require('../protocol/imago/classic')

test('imago program', function (t) {
  t.plan(1)
  var hex = fs.readFileSync('./hex/drive.hex')
  var program = new Program(hex)
  t.equal(program.data.length / 18, program.lineCount)
})
