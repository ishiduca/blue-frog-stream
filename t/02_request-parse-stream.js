'use strict'
const test        = require('tape')
const through     = require('through2')
const ParseStream = require('../lib/request-parse-stream')
const request     = require('blue-frog-core/request')

test('readableStream = new ParseStream(requestObject) # one request object', t => {
    const req1 = request(1, 'sum', [1,2,3])

    const errs = []
    const spy  = []

    const parse = new ParseStream(req1)

    parse
        .on('error', err => errs.push(err))
        .pipe(through.obj((req, _, done) => {
            spy.push(req)
            done()
        }, done => {
            t.is(errs.length, 0 , 'errs.length eq 0')
            t.deepEqual(spy, [{jsonrpc:"2.0", id: 1, method: 'sum', params: [1,2,3]}], 'spy deepEqual [{jsonrpc: "2.0", id: 1, method: "sum", params: [1,2,3]}}')
            done()
            t.end()
        }))
})

test('readableStream = new ParseStream([requestObject list]) # request object list', t => {
    const req1 = request(1, 'sum', [1,2,3])
    const req2 = request.notification('add', [4])
    const req3 = request(3, 'getAmount')
    const list = [req1, {method: 'foo'}, req2, 'invalid value', req3]

    const errs = []
    const spy  = []

    const parse = new ParseStream(list)

    parse
        .on('error', err => errs.push(err))
        .pipe(through.obj((req, _, done) => {
            spy.push(req)
            done()
        }, done => {
            t.is(errs.length, 2, 'errs.length eq 2')
            t.is(spy.length, 3, 'spy.length eq 3')
            t.deepEqual(spy[0], {jsonrpc: "2.0", id: 1, method: "sum", params: [1,2,3]}, 'spy[0] deepEqual {jsonrpc: "2.0", id: 1, method: "sum", params: [1,2,3]}')
            t.deepEqual(spy[1], {jsonrpc: "2.0", id: null, method: "add", params: [4]}, 'spy[1] deepEqual {jsonrpc: "2.0", id: null, method: "add", params: [4]}')
            t.deepEqual(spy[2], {jsonrpc: "2.0", id: 3, method: "getAmount"}, 'spy[2] deepEqual {jsonrpc: "2.0", id: 3, method: "getAmount"}')
            done()
            t.end()
        }))
})
