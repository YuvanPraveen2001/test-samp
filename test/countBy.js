var test = require('tape')
var __ = require('underscore')

test('algo', function (t) {
  t.plan(2)

  var targetFaces = {
    '2': { firmwareType: 0 },
    '3': { firmwareType: 0 },
    '4': { firmwareType: 1 },
  }

  var classicFaces = __(targetFaces).where({ firmwareType: 0 })
  t.equal(classicFaces.length, 2)
  var imagoFaces = __(targetFaces).where({ firmwareType: 1 })
  t.equal(imagoFaces.length, 1)
})
