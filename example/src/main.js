'use strict'
var rpc        = require('blue-frog-stream')
var request    = require('blue-frog-core/request')
var hyperquest = require('hyperquest')
var through    = require('through2')
var body       = require('body/json')

document.querySelector('#createAccount').onsubmit = function (ev) {
    ev.preventDefault()

    var hyp   = hyperquest.post(location.origin)
    var batch = new rpc.request.BatchStream('do JSON.stringify')

    batch.on('error', onError)
    .pipe(through.obj(function (json, _, done) {
        hyp.setHeader('content-type', 'application/json')
        hyp.setHeader('content-length', Buffer.byteLength(json))
        done(null, json)
    }))
    .pipe(hyp).on('error', onError)
    .once('response', function (res) {
        body(res, null, function (err, result) {
            if (err) return onError(err)
            new rpc.response.ParseStream(result).on('error', onError)
            .pipe(through.obj(function (d, _, done) {
                console.log(d)
                done()
            }))
        })
    })

    var $me               = ev.target
    var $account_name     = $me.querySelector('input[name="account_name"]')
    var $account_password = $me.querySelector('input[name="account_password"]')
    var $account_nickname = $me.querySelector('input[name="account_nickname"]')

    var name     = $account_name.value.trim()
    var password = $account_password.value.trim()
    var nickname = $account_nickname.value.trim()

    var req1 = request('start', 'createAccount', {
        name: name, password: password
    })
    var req2; if (nickname) {
        req2 = request.notification('addNickname', {
            nickname: nickname
        })
    }
    var req3 = request('end', 'getAccount')

    batch.write(req1)
    req2 && (batch.write(req2))
    batch.end(req3)
}

function onError (err) {
    console.log(err)
}
