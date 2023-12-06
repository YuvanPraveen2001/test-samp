module.exports = function(clientType){
  return require('./'+clientType);
}
