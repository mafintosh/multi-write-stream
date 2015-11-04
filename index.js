var stream = require('readable-stream')
var util = require('util')

var SIGNAL_END = new Buffer([0])

module.exports = MultiWrite

function MultiWrite (streams, opts) {
  if (!(this instanceof MultiWrite)) return new MultiWrite(streams, opts)
  if (!streams) streams = []

  if (streams && !Array.isArray(streams)) {
    opts = streams
    streams = []
  }

  if (!opts) opts = {}

  stream.Writable.call(this, opts)

  this.streams = streams
  this.destroyed = false
  this._drains = 0
  this._next = noop
  this._add = add
  this._ondrain = ondrain
  this._onclose = onclose
  this._onerror = onerror

  var self = this
  var autoDestroy = opts.autoDestroy !== false
  streams.forEach(add)

  function add (s) {
    if (autoDestroy) {
      s.on('close', onclose)
      s.on('error', onerror)
    }
    s.on('drain', ondrain)
  }

  function onclose () {
    self.destroy()
  }

  function onerror (err) {
    self.destroy(err)
  }

  function ondrain () {
    if (--self._drains) return
    var next = self._next
    self._next = noop
    next()
  }
}

MultiWrite.obj = function (streams, opts) {
  if (streams && !Array.isArray(streams)) return MultiWrite.obj([], streams)
  if (!opts) opts = {}
  opts.objectMode = true
  return new MultiWrite(streams, opts)
}

util.inherits(MultiWrite, stream.Writable)

MultiWrite.prototype.add = function (stream) {
  this.streams.push(stream)
  this._add(stream)
}

MultiWrite.prototype.remove = function (stream) {
  var i = this.streams.indexOf(stream)
  if (i === -1) return
  this.streams.splice(i, 1)
  if (stream._writableState.needDrain) this._ondrain()
  stream.removeListener('error', this._onerror)
  stream.removeListener('close', this._onclose)
  stream.removeListener('drain', this._ondrain)
}

MultiWrite.prototype._write = function (data, enc, cb) {
  if (data === SIGNAL_END) return this._end(cb)

  for (var i = 0; i < this.streams.length; i++) {
    if (this.streams[i].write(data) === false) this._drains++
  }

  if (!this._drains) cb()
  else this._next = cb
}

MultiWrite.prototype._end = function (cb) {
  var missing = this.streams.length

  for (var i = 0; i < this.streams.length; i++) {
    end(this.streams[i], done)
  }

  function done () {
    if (!--missing) cb()
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
  if (ws === process.stdout || ws === process.stderr) return cb()
  if (ws._writableState) return ws.end(cb)
  ws.end()
  cb()
}
