# blue-frog-stream

parse and reduce the batch processing of JSON-RPC2.0 request/respponse.

[JSON-RPC 2.0 specifications](http://jsonrpc.org/specification)

see [example](https://github.com/ishiduca/blue-frog-stream/tree/master/example)

## example

### http server

```js
var rpc      = require('blue-frog-stream')
var response = require('blue-frog-core/response')
var rpcError = require('blue-frog-core/error')
var api      = require('./some-api')

function handler (err, result) {
    var batch = new rpc.response.BatchStream(true)

    if (err) {
        process.nextTick(() => {
            batch.end(response.error(null, rpcError.ParseError(err)))
        })
    }

    else {
        new rpc.request.ParseStream(result)
        .on('error', err => batch.write(InvalidRequest(err)))
        .pipe(through.obj((req, _, done) => {
            if (! api[req.method])
                return done(null, MethodNotFound(err, req)))

            api[req.method](req.params, (err, result) => {
                if (err) return done(null, InvalidParams(err, req))
                if (! req.id) done() // case notification
                else done(null, response(req.id, result))
            }))
        }))
        .pipe(batch)
    }

    return batch
}

var app = http.createServer((req, res) => {
    if (req.method.toUpperCase() === 'POST') helper(req, res, handler)
    else ecstatic(req, res)
})

function helper (req, res, stream) {
    body(req, res, (err, result) => stream(err, result).pipe(res))
}

function InvalidRequest (err) {
    return response.error(null, rpcError.InvalidRequest(err))
}

function MethodNotFound (err, req) {
    return response.error(req.id || null, rpcError.MethodNotFound(err))
}

function InvalidParams (err, req) {
    return response.error(req.id || null, rpcError.InvalidParams(err))
}
```

### http client

```js
var rpc     = require('blue-frog-stream')
var request = require('blue-frog-core/request')

var maap  = mapper()

var batch = rpc.request.BatchStream(true)
var hyp   = hyperquest.post('http://0.0.0.0:3000', {
    'content-type': 'application/json'
})

batch.on('error', onError)
.pipe(hyp).on('error', onError)
.once('response', function (response) {
    body(res, null, function (err, result) {
        if (err) return onError(err)
        new rpc.response.ParseStream(result).on('error', onError)
        .pipe(through.obj(function (res, _, done) {
            maap.value(res, done)
        }))
    })
})

var req1 = request('ID-123-start', 'method', ['params'])
var req2 = request.notification('method2', ['params2'])
var req3 = request('ID-123-finish', 'method')

maap.wrap(req1, function (result, done) {
    console.log(result)
    done()
})
maap.wrap(req3, function (result, done) {
    console.log(result)
    done()
})

batch.write(req1)
batch.write(req2)
batch.end(  req3)


function onError (err) {
    console.log(err)
}

function mapper () {
    return {
        map_: {}
      , wrap: function (req, onSuccess) {
            if (('id' in req) && req.id !== null)
                 return !! (this.map_[req.id] = onSuccess)
            else return false
        }
      , value: function (res, done) {
            if (! this.map_[res.id]) return done()
            else this.map_[res.id](data.result, done)
        }
    }
}
```

## api

```js
var rpc = require('blue-frog-stream')
```

### create a request batch stream. transform stream.

```js
var batch = new rpc.request.BatchStream(doJSONstringify)
```

* `doJSONstringify` : __boolean__. if this value __truthy__, then export data is __jsonString__.

```js
var batch = new rpc.request.BatchStream(true)
batch.on('error' function (err) {
    console.log(err)
   // TypeError: JSON-RPC 2.0 request must be "object"
})
batch.once('data', function (json) {
    console.log(json)
    // [
    // {"jsonrpc":"2.0","method":"sum","id":123,"params":[1,2,3]},
    // {"jsonrpc":"2.0","method":"add","id":null,"params":[4]},
    // {"jsonrpc":"2.0","method":"getResult","id":456}
    // ]
})

batch.write({jsonrpc: "2.0", id: 123, method: "sum", params: [1,2,3]})
batch.write('invalid data')
batch.write({jsonrpc: "2.0", id: null, method: "add", params: [4]})
batch.end(  {jsonrpc: "2.0", id: 456, method: "getResult"})
```

### create a request parse stream. readable stream.

```js
var parse = new rpc.request.ParseStream(jsonRpc2RequestObject)
```

* `jsonRpc2RequestObject` : __object__ or __array__.

```js
var parse = new rpc.request.ParseStream([
    {jsonrpc: "2.0", id: 123, method: "sum", params: [1,2,3]}
  , {jsonrpc: "2.0", id: null, method: "add", params: [4]}
  , {foo: "bar"}
  , {jsonrpc: "2.0", id: 456, method: "getResult"}
])

parse.on('error', err => {
    console.error(err)
    // Error: this method name "foo" is not allowed
})
.on('data', requestObject => {
    ...
})
```

### create a response batch stream. transform stream.

```js
var batch = new rpc.response.BatchStream(doJSONstringify)
```

* `doJSONstringify` : __boolean__. if this value __truthy__, then export data is __jsonString__.

```js
var batch = new rpc.response.BatchStream(true)
batch.on('error' function (err) {
    console.log(err)
   // TypeError: JSON-RPC 2.0 response must be "object"
})
batch.once('data', function (json) {
    console.log(json)
    // [
    // {"jsonrpc":"2.0","id":123,"result":[1,2,3]},
    // {"jsonrpc":"2.0","id":null,"error":{"code":-32602,"message":"Invalid params","data":"TypeError: \\"hoge\\" is not \\"number\\""}
    // {"jsonrpc":"2.0","id":456}
    // ]
})

batch.write({jsonrpc: "2.0", id: 123, result: {amount: 6}})
batch.write('invalid data')
batch.write({jsonrpc: "2.0", id: null, error: {code: -32602, message: "Invalid params", data: "TypeError: \"hoge\" is not \"number\""}})
batch.end(  {jsonrpc: "2.0", id: 456, result: {amount: 10}})
```

### create a response parse stream. readable stream.

```js
var parse = new rpc.response.ParseStream(jsonRpc2RequestObject)
```

* `jsonRpc2RequestObject` : __object__ or __array__.

```js
var parse = new rpc.response.ParseStream([
    {jsonrpc: "2.0", id: 123, result: {amount: 6}}
  , {jsonrpc: "2.0", id: null, error: {code: -32602, message: "Invalid params", data: "TypeError: \"hoge\" is not \"number\""}})
  , {jsonrpc: "2.0", id: 456, result: {amount: 6}}
])

parse.on('error', err => {
    console.log(err)
    // {jsonrpc: "2.0", id: null, error: {code: -32602, message: "Invalid params", data: "TypeError: \"hoge\" is not \"number\""}})
})
.on('data', responseObject => {
    ...
})
```


## see also

[blue-frog-core](https://github.com/ishiduca/blue-frog-core)

## licence

MIT
