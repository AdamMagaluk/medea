var assert = require('assert');
var fs = require('fs');
var medea = require('../');

var directory = __dirname + '/tmp/medea_open_close_test';

describe('Medea an not opened db', function() {
  var db = medea();

  it('#put() should error', function (done) {
    db.put('beep', 'boop', function (err) {
      assert(err instanceof Error);
      done();
    });
  });

  it('#get() should error', function (done) {
    db.get('beep', function (err) {
      assert(err instanceof Error);
      done();
    });
  });

  it('#remove() should error', function (done) {
    db.remove('beep', function (err) {
      assert(err instanceof Error);
      done();
    });
  });

  it('#write() should error', function (done) {
    var batch = db.createBatch();

    batch.put('hello', 'world');

    db.write(batch, function (err) {
      assert(err instanceof Error);
      done();
    });
  });

  it('#createSnapshot() should throw', function (done) {
    assert.throws(db.createSnapshot.bind(db), Error);
    done();
  });

  it('#compact() should error', function (done) {
    db.compact(function (err) {
      assert(err instanceof Error);
      done();
    });
  });
});

describe('Medea db that failed to open', function() {
  var db = medea();
  var tmp = medea();

  before(function (done) {
    tmp.open(directory, function (err) {
      if (err) {
        return done(err);
      }

      db.open(directory, function (err) {
        assert(err instanceof Error);
        done();
      });
    });
  });

  after(function (done) {
    tmp.close(done);
  });

  it('#put() should error', function (done) {
    db.put('beep', 'boop', function (err) {
      assert(err instanceof Error);
      done();
    });
  });

  it('#get() should error', function (done) {
    db.get('beep', function (err) {
      assert(err instanceof Error);
      done();
    });
  });

  it('#remove() should error', function (done) {
    db.remove('beep', function (err) {
      assert(err instanceof Error);
      done();
    });
  });

  it('#write() should error', function (done) {
    var batch = db.createBatch();

    batch.put('hello', 'world');

    db.write(batch, function (err) {
      assert(err instanceof Error);
      done();
    });
  });

  it('#createSnapshot() should throw', function (done) {
    assert.throws(db.createSnapshot.bind(db), Error);
    done();
  });

  it('#compact() should error', function (done) {
    db.compact(function (err) {
      assert(err instanceof Error);
      done();
    });
  });
});

describe('Medea db closed', function() {
  var db = medea();

  before(function (done) {
    db.open(directory, function (err) {
      if (err) {
        return done(err);
      }

      db.close(done);
    });
  });

  it('#put() should error', function (done) {
    db.put('beep', 'boop', function (err) {
      assert(err instanceof Error);
      done();
    });
  });

  it('#get() should error', function (done) {
    db.get('beep', function (err) {
      assert(err instanceof Error);
      done();
    });
  });

  it('#remove() should error', function (done) {
    db.remove('beep', function (err) {
      assert(err instanceof Error);
      done();
    });
  });

  it('#write() should error', function (done) {
    var batch = db.createBatch();

    batch.put('hello', 'world');

    db.write(batch, function (err) {
      assert(err instanceof Error);
      done();
    });
  });

  it('#createSnapshot() should throw', function (done) {
    assert.throws(db.createSnapshot.bind(db), Error);
    done();
  });

  it('#compact() should error', function (done) {
    db.compact(function (err) {
      assert(err instanceof Error);
      done();
    });
  });
});