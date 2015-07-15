var stream = require('readable-stream')
var util = require('util')

var SIGNAL_END = new Buffer([0])

module.exports = MultiWrite

function MultiWrite (streams, opts) {
  if (!(this instanceof MultiWrite)) return new MultiWrite(streams, opts)
  if (!opts) opts = {}
  stream.Writable.call(this, opts)

  this.streams = streams
  this.destroyed = false
  this._drains = 0
  this._ondrain = noop

  var self = this
  streams.forEach(function (s) {
    s.on('close', function () {
      self.destroy()
    })

    s.on('error', function (err) {
      self.destroy(err)
    })

    s.on('drain', function () {
      self._drains--

      if (!self._drains) {
        var ondrain = self._ondrain
        self._ondrain = noop
        ondrain()
      }
    })
  })
}

MultiWrite.obj = function (streams, opts) {
  if (!opts) opts = {}
  opts.objectMode = true
  return new MultiWrite(streams, opts)
}

util.inherits(MultiWrite, stream.Writable)

MultiWrite.prototype._write = function (data, enc, cb) {
  if (data === SIGNAL_END) return this._end(cb)

  for (var i = 0; i < this.streams.length; i++) {
    if (this.streams[i].write(data) === false) this._drains++
  }

  if (!this._drains) return cb()
  this._ondrain = cb
}

MultiWrite.prototype._end = function (cb) {
  var self = this
  loop(0)

  function loop (i) {
    if (i >= self.streams.length) return cb()
    end(self.streams[i], function (err) {
      if (err) return cb(err)
      loop(i + 1)
    })
  }
}

MultiWrite.prototype.destroy = function (err) {
  if (this.destroyed) return
  this.destroyed = true
  for (var i = 0; i < this.streams.length; i++) {
    if (this.streams[i]) this.streams[i].destroy()
  }
  if (err) this.emit('error', err)
  this.emit('close')
}

MultiWrite.prototype.end = function (data, enc, cb) {
  if (typeof data === 'function') return this.end(null, null, data)
  if (typeof enc === 'function') return this.end(data, null, enc)
  if (data) this.write(data, enc)
  if (cb) this.once('finish', cb)
  if (!this._writableState.ending) this.write(SIGNAL_END)
  stream.Writable.prototype.end.call(this)
}

function noop () {}

function end (ws, cb) {
  if (ws._writableState) return ws.end(cb)
  ws.end()
  cb()
}
