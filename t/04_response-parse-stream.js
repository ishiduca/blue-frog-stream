'use strict'
const test         = require('tape')
const through      = require('through2')
const ParseStream  = require('../lib/response-parse-stream')
const response     = require('blue-frog-core/response')
const JsonRpcError = require('blue-frog-core/error')

test('readableStream = new ParseStream(responseObject) # one response object', t => {
    const res = response(1, null)

    const spy  = []
    const errs = []

    ParseStream(res)
        .on('error', err => errs.push(err))
        .pipe(through.obj((res, _, done) => {
            spy.push(res)
            done()
        }, done => {
            t.is(errs.length, 0, 'error not found')
            t.is(spy.length,  1, 'spy.length eq 1')
            t.deepEqual(spy[0], {jsonrpc: "2.0", id: 1, result: null}, 'spy[0] deepEqual {jsonrpc: "2.0", id: 1, result: null}')
            done()
            t.end()
        }))
})

test('readableStream = new ParseStream([responseObject list]) # response object list', t => {
    const res1 = response(1, null)
    const res2 = response.error(null, {code: -32111, message: 'Fuba error', data: 'fuba'})
    const res3 = response(2, [null])
    const bobError = new Error('bob is not boob')
    const res4 = response.error(3, new JsonRpcError(-32123, 'Bob error', String(bobError)))
    const parseError = new SyntaxError('JSON parse error: can not parse')
    parseError.data = '{hoge: "hoe hoe"]'
    parseError.code = -32112
    const spy  = []
    const errs = []

    ParseStream([
        res1
      , 'invalid value'
      , res2
      , {jsonrpc: "2.0", result: null}
      , res3
      , {jsonrpc: "2.0", id: "hoge", error: parseError}
      , res4
    ])
    .on('error', err => errs.push(err))
    .pipe(through.obj((res, _, done) => {
        spy.push(res)
        done()
    }, done => {
        t.is(errs.length, 5, 'errs.length eq 5')
        t.is(spy.length, 2, 'spy.length eq 2')
        t.ok(/TypeError.*?JSON-RPC 2\.0 response must be "object"/.test(String(errs[0])), String(errs[0]))
        t.ok(/JsonRpcError.*?Fuba error/.test(String(errs[1])), String(errs[1]))
        t.is(errs[1].code, -32111, 'errs[1].code eq -32111')
        t.is(errs[1].data, 'fuba', 'errs[1].data eq "fuba"')
        t.ok(/Error.*?required method "id" not found/.test(String(errs[2])), String(errs[2]))
        t.is(errs[3].code, -32112, 'errs[3].code eq -32112')
        t.is(errs[3].id,   "hoge",   'errs[3].id eq "hoge"')
        t.is(errs[3].message, 'JSON parse error: can not parse', 'errs[3].message eq "JSON parse error: can not parse"')
        t.ok(/JsonRpcError.*?Bob error/.test(String(errs[4])), String(errs[4]))
        t.is(errs[4].code, -32123, 'errs[4].code eq -32123')
        t.is(errs[4].id,   3, 'errs[4].id eq 3')
        t.is(errs[4].message, 'Bob error', 'errs[4].message eq "Bob error"')
        t.ok(/Error.*?bob is not boob/.test(errs[4].data), errs[4].data)
        t.deepEqual(spy[0], {jsonrpc: "2.0", id: 1, result: null}, 'spy[0] deepEqual {jsonrpc: "2.0", id: 1, result: null}')
        t.deepEqual(spy[1], {jsonrpc: "2.0", id: 2, result: [null]}, 'spy[1] deepEqual {jsonrpc: "2.0", id: 2, result: [null]}')
        done()
        t.end()
    }))
})
