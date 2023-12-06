var test = require('tape')
var config = require('./config')
var cubelets = require('../index')()
var __ = require('underscore')
var Protocol = cubelets.Protocol

var client = cubelets.connect(config.device, function (err) {
	test('connected', function (t) {
		t.plan(1)
		if (err) {
			t.end(err)
		} else {
			t.pass('connected')

			test('get all blocks', function (t) {
				t.plan(2)
				client.sendRequest(new Protocol.messages.GetAllBlocksRequest(), function (err, response) {
					t.ifError(err, 'no blocks response err')
					t.ok(response, 'blocks response ok')
					console.log(response)
				})
			})
			test('disconnect', function (t) {
				t.plan(1)
				client.disconnect(t.ifError)
			})
		}
	})
})
