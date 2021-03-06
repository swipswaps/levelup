var levelup = require('../lib/levelup')
var memdown = require('memdown')
var encdown = require('encoding-down')
var after = require('after')

module.exports = function (test, testCommon) {
  ;[true, false].forEach(function (encode) {
    ;[true, false].forEach(function (deferredOpen) {
      ;[true, false].forEach(function (delayedPut) {
        makeTest(test, encode, deferredOpen, delayedPut)
      })
    })
  })
}

function makeTest (test, encode, deferredOpen, delayedPut) {
  var name = [
    'readStream before put',
    encode && 'encode',
    deferredOpen && 'deferred open',
    delayedPut && 'delayed put'
  ].filter(Boolean).join(', ')

  test(name, function (t) {
    var db = encode ? levelup(encdown(memdown())) : levelup(memdown())
    var delay = delayedPut ? process.nextTick : callFn

    run(t, db, !deferredOpen, delay)
  })
}

function run (t, db, explicitOpen, delay) {
  if (explicitOpen) {
    return db.open(function (err) {
      t.ifError(err, 'no open error')
      run(t, db, false, delay)
    })
  }

  var reads = 0
  var next = after(11, function (err) {
    t.ifError(err, 'no error')
    t.is(reads, 0, 'got 0 items from snaphot')

    db.close(function (err) {
      t.ifError(err, 'no close error')
      t.end()
    })
  })

  // Should read from a snapshot, unaffected by later writes,
  // even if those are performed in the same tick.
  db.createReadStream()
    .on('data', function () {
      reads++
    })
    .on('end', next)

  // Write data
  delay(function () {
    for (var i = 0; i < 10; i++) {
      db.put(String(i), String(i), next)
    }
  })
}

function callFn (fn) {
  fn()
}
