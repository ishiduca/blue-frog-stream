var stream   = require('readable-stream')
var inherits = require('inherits')
var safe     = require('json-stringify-safe')
var valid    = require('blue-frog-core/validate')

module.exports = ResponseBatchStream

inherits(ResponseBatchStream, stream.Transform)

function ResponseBatchStream (doJsonStringify) {
    if (!(this instanceof ResponseBatchStream))
        return new ResponseBatchStream(doJsonStringify)
    stream.Transform.call(this, {objectMode: true})
    this.doJsonStringify = doJsonStringify
    this.responses = []
}

ResponseBatchStream.prototype._transform = function (d, _, done) {
    if (d && d.error) {
        try {
            valid.error(d)
        } catch (err) {
            err.id = d.id || null
            return done(err)
        }
    }

    else {
        try {
            valid.response(d)
        } catch (err) {
            err.id = d.id || null
            return done(err)
        }
    }

    this.responses.push(d)
    done()
}

ResponseBatchStream.prototype._flush = function (done) {
    if (this.responses.length) {
        if (this.responses.length === 1) help(this, this.responses[0])
        else help(this, this.responses)
    }

    this.push(null)
    done()

    function help (me, responses) {
        me.push(me.doJsonStringify ? safe(responses) : responses)
    }
}
