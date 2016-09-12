'use strict'
const http     = require('http')
const path     = require('path')
const url      = require('url')
const ecstatic = require('ecstatic')(path.join(__dirname, 'static'))
const through  = require('through2')
const body     = require('body/json')
const request  = require('blue-frog-core/request')
const response = require('blue-frog-core/response')
const rpcError = require('blue-frog-core/error')
const rpc      = require('blue-frog-stream')
const api      = require('./api')

const app = http.createServer((req, res) => {
    if (req.method.toUpperCase() === 'POST') helper(req, res, handler)
    else ecstatic(req, res)
})

app.listen(process.env.PORT || 3003, () => {
    console.log('server start to listen on port "%s"'
      , app.address().port)
})

function handler (err, result) {
    const batch = new rpc.response.BatchStream('do JSON.stringify')

    process.nextTick(() => {
        const context = {state: {}}
        if (err) return batch.end(parseError(err))

        rpc.request.ParseStream(result)
          .on('error', err => batch.write(invalidRequest(err)))

        .pipe(through.obj((req, _, done) => {
            const _api = api[req.method]
            if (typeof _api !== 'function')
                return done(null, methodNotFound(req))

            _api(context.state, req.params, (err, res) => {
                if (err) return done(null, invalidParams(err, req))
                context.state = res
                if (! req.id) done()
                else done(null, response(req.id, res))
            })
        }))
        .pipe(batch)
    })

    return batch

    function parseError (err) {
        return response.error(null, rpcError.ParseError(err))
    }

    function invalidRequest (err) {
        return response.error(err.id || null
            , rpcError.InvalidRequest(err))
    }

    function methodNotFound (req) {
        const err = new Error('this method "' + req.method + '" is not implemented, in this api')
        return response.error(req.id || null
            , rpcError.MethodNotFound(err))
    }

    function invalidParams (err, req) {
        return response.error(req.id || err.id || null
            , rpcError.InvalidParams(err))
    }
}

function helper (req, res, stream) {
    body(req, res, (err, result) => {
        stream(err, result).pipe(through.obj((json, _, done) => {
            res.setHeader('content-type', 'application/json')
            res.setHeader('content-length', Buffer.byteLength(json))
            done(null, json)
        }))
        .pipe(res)
    })
}
