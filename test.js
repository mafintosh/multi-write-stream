var tape = require('tape')
var multiwrite = require('./')
var through = require('through2')
var concat = require('concat-stream')

tape('works', function (t) {
  t.plan(2)

  var a = through()
  var b = through()
  var ws = multiwrite([a, b])

  ws.write('a')
  ws.write('b')
  ws.write('c')
  ws.end()

  a.pipe(concat(function (data) {
    t.same(data.toString(), 'abc', 'same data')
  }))

  b.pipe(concat(function (data) {
    t.same(data.toString(), 'abc', 'same data')
  }))
})

tape('backpressure', function (t) {
  t.plan(2)

  var a = through({highWaterMark: 1})
  var b = through()
  var ws = multiwrite([a, b])

  ws.write('a')
  ws.write('b')
  ws.write('c')
  ws.write('d')
  ws.write('e')
  ws.end()

  a.pipe(concat(function (data) {
    t.same(data.toString(), 'abcde', 'same data')
  }))

  b.pipe(concat(function (data) {
    t.same(data.toString(), 'abcde', 'same data')
  }))
})

tape('finish', function (t) {
  var aFinished = false
  var bFinished = false
  var a = through()
  var b = through()
  var ws = multiwrite([a, b])

  a.on('finish', function () {
    aFinished = true
  })

  b.on('finish', function () {
    bFinished = true
  })

  ws.on('finish', function () {
    t.ok(aFinished, 'a finished')
    t.ok(bFinished, 'b finished')
    t.end()
  })

  ws.write('a')
  ws.end()
})

tape('destroy', function (t) {
  t.plan(2)

  var a = through()
  var b = through()
  var ws = multiwrite([a, b])

  a.on('close', function () {
    t.ok(true, 'a destroyed')
  })

  b.on('close', function () {
    t.ok(true, 'b destroyed')
  })

  ws.destroy()
})

tape('stdout', function (t) {
  t.plan(1)

  var a = through()
  var ws = multiwrite([process.stdout, a])

  a.on('finish', function () {
    t.ok(true, 'stdout not ended')
  })

  ws.end()
})
