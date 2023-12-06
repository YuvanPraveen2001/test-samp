var PouchDB = require('pouchdb')
var personalitiesSeed = require('../services/data/personalities_seed.json')

var db = new PouchDB('personalities')
var cacheKey = "personalities-source-all-djhfdjhfjh"


db.get(cacheKey).then(function(doc) {
  var newD = {
    _rev: doc._rev,
  }
  let obj = { ...doc, ...personalitiesSeed, ...newD };
  return db.put(obj);
}).then(function(response) {
  // handle response
  console.log(response)
  db.get(cacheKey).then(function(doc){
    console.log(doc)
  })
}).catch(function (err) {
  console.log(err);
  db.put({_id: cacheKey, data: personalitiesSeed}, function callback(err, result) {
    if (!err) {
      console.log('Successfully posted a todo!', result);

      db.get(cacheKey).then(function(doc){
        console.log(doc)
      })
    }
    else{
      console.log(err)
    }
  });
});
