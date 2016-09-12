'use strict'
const test         = require('tape')
const http         = require('http')
const through      = require('through2')
const hyperquest   = require('hyperquest')
const body         = require('body/json')
const JsonRpcError = require('blue-frog-core/error')
const request      = require('blue-frog-core/request')
const response     = require('blue-frog-core/response')
const rpc = {
    request: {
        BatchStream: require('../lib/request-batch-stream')
      , ParseStream: require('../lib/request-parse-stream')
    }
  , response: {
        BatchStream: require('../lib/response-batch-stream')
      , ParseStream: require('../lib/response-parse-stream')
    }
}

const calcs = {
    sum: function (state, list, done) {
        try {
            const count = list.reduce((x, a) => x + a, state.count || 0)
            done(null, {count: count})
        } catch (err) {
            done(err)
        }
    }
  , add: function (state, num, done) {
        try {
            const count = (state.count || 0) + num.shift()
            done(null, {count: count})
        } catch (err) {
            done(err)
        }
    }
  , amount: function (state, _, done) {
        done(null, state)
    }
}

function handler (err, result) {
    const batch = new rpc.response.BatchStream('do JSON.stringify')

    batch.on('error', err => {
        const msg = 'JSON-RPC 2.0 response error'
        batch.write(response.error(
                        err.id || null
                      , new JsonRpcError(-32000, msg, err)))
    })

    process.nextTick(() => {
        const context = {state: {}}
        if (err) return batch.end(_parseError(err))

        rpc.request.ParseStream(result)
            .on('error', err => batch.write(_InvalidRequest(err)))

        .pipe(through.obj((req, _, done) => {
            const api = calcs[req.method]
            if (typeof api !== 'function') {
                const err = new Error('method: "'+req.method+'" not found')
                return done(null, _MethodNotFound(err))
            }

            api(context.state, req.params, (err, res) => {
                if (err) return done(null, _serverError(err, req.id || null))

                context.state = res
                if (! req.id) done() // notification
                else done(null, response(req.id, res))
            })
        }))

        .pipe(batch)
    })

    return batch

    function _serverError (err, id) {
        return response.error(id
                 , new JsonRpcError(
                     -32000, 'Server error', err))
    }

    function _parseError (err) {
        return response.error(err.id || null
                 , JsonRpcError.ParseError(err))
    }

    function _InvalidRequest (err) {
        return response.error(err.id || null
                 , JsonRpcError.InvalidRequest(err))
    }

    function _MethodNotFound (err) {
        return response.error(err.id || null
                 , JsonRpcError.MethodNotFound(err))
    }
}

function help (req, res, stream) {
    body(req, res, (err, result) => {
        stream(err, result).pipe(through.obj((json, _, done) => {
            res.setHeader('content-type', 'application/json')
            res.setHeader('content-length', Buffer.byteLength(json))
            done(null, json)
        }))
        .pipe(res)
    })
}

const app = http.createServer((req, res) => help(req, res, handler))

const port = 3030

app.listen(port, () => {
    test('client-->server-->client no exp request', t => {
        const batch = client(t, (errs, spy, done) => {
            t.is(errs.length, 0, 'error not found')
            t.is(spy.length, 2, 'spy.length eq 2')
            t.deepEqual(spy[0], {jsonrpc: "2.0", id: "start", result: {count: 3}}, 'spy[0] deepEqual {jsonrpc:"2.0", id: "start", result: {count: 3}}')
            t.deepEqual(spy[1], {jsonrpc: "2.0", id: "end", result: {count: 6}}, 'spy[1] deepEqual {jsonrpc:"2.0", id: "end", result: {count: 6}}')
            done()
            t.end()
        })

        batch.write(request('start', 'sum', [1, 2]))
        batch.write(request.notification('add', [3]))
        batch.end(  request('end',    'amount'))
    })
    test('client-->server-->client # exits method_not_found_error', t => {
        const batch = client(t, (errs, spy, done) => {
            t.is(errs.length, 1, 'errs.length eq 1')
            t.is(errs[0].message, 'Method not found', 'errs[0].message eq "' + errs[0].message + '"')
            t.is(errs[0].code, -32601, 'errs[0].code eq' + errs[0].code)
            t.is(errs[0].id, null, 'errs[0].id eq null')
            t.ok(/Error.*?method.*?"adda" not found/.test(errs[0].data), 'errs[0].data "' + errs[0].data + '"')
            t.is(spy.length, 2, 'spy.length eq 2')
            t.deepEqual(spy[0], {jsonrpc: "2.0", id: "start", result: {count: 3}}, 'spy[0] deepEqual {jsonrpc:"2.0", id: "start", result: {count: 3}}')
            t.deepEqual(spy[1], {jsonrpc: "2.0", id: "end", result: {count: 3}}, 'spy[1] deepEqual {jsonrpc:"2.0", id: "end", result: {count: 3}}')
            done()
            t.end()
        })

        batch.write(request('start', 'sum', [1, 2]))
        batch.write(request.notification('adda', [3]))
        batch.end(  request('end',    'amount'))
    })
    test('client-->server-->client # exits invalid_params', t => {
        app.once('close', t.end.bind(t))

        const batch = client(t, (errs, spy, done) => {
            t.is(errs.length, 1, 'errs.length eq 1')
            t.is(errs[0].message, 'Server error', 'errs[0].message eq "' + errs[0].message + '"')
            t.is(errs[0].code, -32000, 'errs[0].code eq ' + errs[0].code)
            t.is(errs[0].id, "start", 'errs[0].id eq "start"')
            t.ok(/TypeError.*?is not a function/.test(errs[0].data), 'errs[0].data "' + errs[0].data + '"')
            t.is(spy.length, 1, 'spy.length eq 1')
            t.deepEqual(spy[0], {jsonrpc: "2.0", id: "end", result: {count: 3}}, 'spy[0] deepEqual {jsonrpc:"2.0", id: "end", result: {count: 3}}')
            done()
            app.close()
        })

        batch.write(request('start', 'sum', {val: [1, 2]}))
        batch.write(request.notification('add', [3]))
        batch.end(  request('end',    'amount'))
    })
})

function client (t, cb) {
    const errs = []
    const spy  = []
    const hyp   = hyperquest.post('http://0.0.0.0:' + port)
    const batch = new rpc.request.BatchStream('do JSON.stringify')

    batch.pipe(through.obj((json, _, done) => {
        hyp.setHeader('content-type', 'application/json')
        hyp.setHeader('content-length', Buffer.byteLength(json))
        done(null, json)
    }))
    .pipe(hyp).on('error', err => console.log(err))
    .once('response', res => {
        body(res, null, (err, result) => {
            if (err) return cb([err], spy, function () {})

            new rpc.response.ParseStream(result)
            .on('error', err => errs.push(err))
            .pipe(through.obj((res, _, done) => {
                spy.push(res)
                done()
            }, done => {
                cb(errs, spy, done)
            }))
        })
    })

    return batch
}
