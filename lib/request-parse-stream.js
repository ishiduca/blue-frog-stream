var stream   = require('readable-stream')
var inherits = require('inherits')
var validate = require('blue-frog-core/validate').request

inherits(RequestParseStream, stream.Readable)
module.exports = RequestParseStream

function RequestParseStream (source) {
    if (!(this instanceof RequestParseStream))
        return new RequestParseStream(source)
    stream.Readable.call(this, {objectMode: true})
    this.source = [].concat(source)
}

RequestParseStream.prototype._read = function () {
    help(this)

        function help (me) {
            var d = me.source.shift()
            if (typeof d === 'undefined') return me.push(null)

            try {
                validate(d)
                me.push(d)
            } catch (err) {
                err.id = d.id || null
                me.emit('error', err)
                help(me)
            }
        }
}
