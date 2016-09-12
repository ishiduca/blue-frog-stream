module.exports.request = {
    BatchStream: require('./lib/request-batch-stream')
  , ParseStream: require('./lib/request-parse-stream')
}
module.exports.response = {
    BatchStream: require('./lib/response-batch-stream')
  , ParseStream: require('./lib/response-parse-stream')
}
