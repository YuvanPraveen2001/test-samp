var test = require('tape')
var fs = require('fs')
var UpdateService = require('../services/update')

var updateService = new UpdateService()

function testSetBlockUpdated(blockId, val) {
  test('set block updated ' + blockId, function (t) {
    t.plan(1)
    
    updateService.setBlockUpdated(blockId, val, function(err)
    {
    	t.ifError(err, "Sucessfully set block as "+(val ? "" : "not ")+"updated")
    });
  })
}

testSetBlockUpdated(2585, true)
testSetBlockUpdated(2585, false)
