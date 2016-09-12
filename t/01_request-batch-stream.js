'use strict'
const test        = require('tape')
const through     = require('through2')
const BatchStream = require('../lib/request-batch-stream')
const request     = require('blue-frog-core/request')

test('var transformStream = new BatchStream(true)', t => {
    const batch = new BatchStream()

    const req1 = request(123, 'createAccount', {
        name: 'benjamine', pass: 'harper'
    })
    const req2 = request.notification('addNickname', {nickname: 'B.H'})
    const req3 = request(456, 'getAccount')

    const spy  = []
    const errs = []

    batch

    .on('error', err => errs.push(err))

    .pipe(through.obj((o, _, done) => {
        spy.push(o)
        done()
    }, done => {
        t.is(errs.length, 2, 'errs.length eq 2')
        t.ok(/TypeError.*?JSON-RPC 2\.0 request must be "object"/.test(String(errs[0])), String(errs[0]))
        t.ok(/Error.*?this method name "xmethod" is not allowed/.test(String(errs[1])), String(errs[1]))
        t.is(spy.length, 1, 'spy.length eq 1')
        t.is(spy[0].length, 3, 'spy[0].length eq 3')
        t.deepEqual(spy[0][0], {jsonrpc: "2.0", id: 123, method: 'createAccount', params: {name: 'benjamine', pass: 'harper'}}, 'spy[0][0] deepEqual {jsonrpc: "2.0", id: 123, method: "createAccount", params: {name: "benjamine", pass: "harper"}}')
        t.deepEqual(spy[0][1], {jsonrpc: "2.0", id: null, method: 'addNickname', params: {nickname: 'B.H'}}, 'spy[0][1] deepEqual {jsonrpc: "2.0", id: null, method: "addNickname", params: {nickname: "B.H"}}')
        t.deepEqual(spy[0][2], {jsonrpc: "2.0", id: 456, method: 'getAccount'}, 'spy[0][2] deepEqual {jsonrpc: "2.0", id: 456, method: "getAccount"}')
        done()
        t.end()
    }))

    batch.write(req1)
    batch.write('invalid value')
    batch.write(req2)
    batch.write({jsonrpc: "2.0", xmethod: "notAllowMethod"})
    batch.write(req3)
    batch.end()
})

