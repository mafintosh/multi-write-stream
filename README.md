# multi-write-stream

Create a writable stream that writes to multiple other writeable streams

```
npm install multi-write-stream
```

[![build status](http://img.shields.io/travis/mafintosh/multi-write-stream.svg?style=flat)](http://travis-ci.org/mafintosh/multi-write-stream)

## Usage

``` js
var multi = require('multi-write-stream')
var fs = require('fs')

var stream = multi([
  fs.createWriteStream('file-1'),
  fs.createWriteStream('file-2')
])

stream.write('hello')
stream.write('world')

stream.end(function () {
  // both file-1 and file-2 now contains 'helloworld'
})
```

## API

#### `stream = multi(arrayOfWritableStreams, [options])`

Create a new multi write stream. Options are forwarded to the
stream constructor.

#### `objStream = multi.obj(arrayOfWritableStreams, [options])`

Same as above but sets `objectMode = true`

## License

MIT
