'use strict'
const xtend = require('xtend')
const uuid  = require('uuid')
const store = {}

module.exports.createAccount = (state, params, f) => {
    const id       = uuid.v4()
    const name     = String((params || {}).name || '').trim()
    const password = String((params || {}).password || '').trim()

    if (! name) return f(new TypeError('"name" not found # api.createAccount'))
    if (! password) return f(new TypeError('"password" not found # api.createAccount'))

    store[id] = {
        id: id
      , name: name
      , password: password
   }

    const account = xtend(store[id])
    delete account.password
    f(null, account)
}

module.exports.addNickname = (state, params, f) => {
    const id       = (state || {}).id
    const nickname = String((params || {}).nickname || '').trim()

    if (! id) return f(new Error('"id" not found # api.addNickname'))
    if (! store[id]) return f(new Error('"account" not found # api.addNickname'))
    if (! nickname) return f(new Error('"nickname" not found # api.addNickname'))

    store[id] = xtend(store[id], {nickname: nickname})

    const account = xtend(store[id])
    delete account.password
    f(null, account)
}

module.exports.getAccount = (state, params, f) => {
    const id = (state || {}).id

    if (! id) return f(new Error('"id" not found # api.getAccount'))
    if (! store[id]) return f(new Error('"account" not found # api.getAccount'))

    const account = xtend(store[id])

    delete account.password
    f(null, account)
}
