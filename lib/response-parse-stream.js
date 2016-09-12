var stream       = require('readable-stream')
var inherits     = require('inherits')
var valid        = require('blue-frog-core/validate')
var JsonRpcError = require('blue-frog-core/error')

inherits(ResponseParseStream, stream.Readable)
module.exports = ResponseParseStream

function ResponseParseStream (source) {
    if (!(this instanceof ResponseParseStream))
        return new ResponseParseStream(source)
    stream.Readable.call(this, {objectMode: true})
    this.source = [].concat(source)
}

ResponseParseStream.prototype._read = function () {
    help(this)

    function help (me) {
        var d = me.source.shift()
        if (typeof d === 'undefined') return me.push(null)

        if (d && d.error) {
            try {
                valid.error(d)
            } catch (err) {
                err.id = d.id || null
                me.emit('error', err)
                return help(me)
            }
            var e = new JsonRpcError(
                    d.error.code, d.error.message, d.error.data)
            e.id = d.id || null
            me.emit('error', e)
            return help(me)
        }

        else {
            try {
                valid.response(d)
            } catch (err) {
                err.id = d.id || null
                me.emit('error', err)
                return help(me)
            }
        }

        me.push(d)
    }
}
