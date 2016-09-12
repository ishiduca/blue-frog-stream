'use strict'
const test = require('tape')
const through      = require('through2')
const BatchStream  = require('../lib/response-batch-stream')
const response     = require('blue-frog-core/response')
const JsonRpcError = require('blue-frog-core/error')

test('const batch = new BatchStream(doJSONstringify)', t => {
    const res1 = response(1, 6)
    const res2 = response.error(null, JsonRpcError.InvalidParams(new Error('bage')))
    const res3 = response(3, {amount: 10, average: 5})
    const spy  = []
    const errs = []

    const batch = new BatchStream

    batch
        .on('error', err => errs.push(err))
        .pipe(through.obj((res, _, done) => {
            spy.push(res)
            done()
        }, done => {
            t.is(errs.length, 2, 'errs.length eq 2')
            t.ok(/TypeError.*JSON-RPC 2\.0 response must be "object"/.test(String(errs[0])), String(errs[0]))
            t.ok(/Error.*?this method name "foo" is not allowed/.test(String(errs[1])), String(errs[1]))
            t.is(spy.length,  1, 'spy.length eq 1')
            t.is(spy[0].length,  3, 'spy[0].length  eq 3')
            t.deepEqual(spy[0][0], {jsonrpc: "2.0", id: 1, result: 6}, 'spy[0][0] deepEqual {jsonrpc: "2.0", id: 1, result: 6}')
            t.is(spy[0][1].jsonrpc, "2.0", 'spy[0][1].jsonrpc eq "2.0"')
            t.is(spy[0][1].id, null, 'spy[0][1].id eq null')
            t.is(spy[0][1].error.code, -32602, 'spy[0][1].error.code eq -32602')
            t.is(spy[0][1].error.message, "Invalid params", 'spy[0][1].error.message eq Invalid params"')
            t.ok(/Error.*bage/.test(String(spy[0][1].error.data)), String(spy[0][1].error.data))
            t.deepEqual(spy[0][2], {jsonrpc: "2.0", id: 3, result: {amount: 10, average: 5}}, 'spy[0][2] deepEqual {jsonrpc: "2.0", id: 3, result: {amount: 10, average: 5}}')
            t.end()
        }))

    batch.write(res1)
    batch.write("invalid data")
    batch.write(res2)
    batch.write({foo: 123})
    batch.end(res3)
})
