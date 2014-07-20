var assert = require('assert');
var Medea = require('../');

var directory = __dirname + '/tmp/medea_test';
var db;

describe('Medea', function() {
  before(function(done) {
    require('rimraf')(directory, function () {
      db = new Medea({ maxFileSize: 1024*1024 });
      db.open(directory, function(err) {
        done();
      });
    })
  });

  it('has a max file size', function() {
    var db = new Medea();
    assert(db.maxFileSize > 0);
  });

  describe('#put', function() {
    it('successfully stores a String value', function(done) {
      db.put('hello', 'world', function(err) {
        assert(!err);
        done();
      });
    });

    it('successfully stores a Buffer value', function (done) {
      db.put('foo', new Buffer('bar'), function(err) {
        assert(!err);
        done();
      });
    });
  });

  describe('#get', function() {
    it('successfully retrieves a value', function(done) {
      db.put('hello', 'world', function(err) {
        db.get('hello', function(err, val) {
          assert.equal(val.toString(), 'world');
          done();
        });
      });
    });

    it('successfully retrieves a value', function(done) {
      db.put('foo', new Buffer('bar'), function(err) {
        db.get('foo', function(err, val) {
          assert.equal(val.toString(), 'bar');
          done();
        });
      });
    });
  });

  describe('#remove', function() {
    it('successfully removes a value', function(done) {
      db.put('hello', 'world', function(err) {
        db.remove('hello', function(err) {
          assert(!err);
          done();
        });
      });
    });
  });

  describe('#write', function() {
    it('supports single put operations', function(done) {
      var batch = db.createBatch();
      batch.put('hello', 'world');
      db.write(batch, function() {
        db.get('hello', function(err, val) {
          assert.equal(val.toString(), 'world');
          done();
        });
      });
    });

    it('supports single remove operations', function(done) {
      db.put('hello','world', function() {
        var batch = db.createBatch();
        batch.remove('hello');
        db.write(batch, function() {
          db.get('hello', function(err, val) {
            assert(!val);
            done();
          });
        });
      });
    });

    it('supports both put and remove operations', function(done) {
      db.put('hello','world', function() {
        var batch = db.createBatch();
        batch.put('hello2', 'world2');
        batch.remove('hello');
        db.write(batch, function() {
          db.get('hello2', function(err, val) {
            assert.equal(val.toString(), 'world2');
            db.get('hello', function(err, val) {
              assert(!val);
              done();
            });
          });
        });
      });
    });
  });

  describe('#sync', function() {
    it('successfully fsync()\'s files', function(done) {
      db.sync(function(err) {
        assert(!err);
        done();
      });
    });
  });

  describe('#listKeys', function() {
    it('returns keys', function(done) {
      db.put('hello$', 'world', function(err) {
        db.listKeys(function(err, arr) {
          assert(arr.indexOf('hello$') > -1);
          done();
        });
      });
    });
  });

  describe('#mapReduce', function() {
    it('successfully maps values', function(done) {
      db.put('yello$', 'world', function(err) {
        var map = function(key, value, emit) {
          emit('value', 1);
        };

        var reduce = function(key, values) {
          if (key == 'value') {
            return [values.length];
          }
        };

        var options = { map: map, reduce: reduce };

        db.mapReduce(options, function(values) {
          assert(values[0] > 0);
          done();
        });
      });
    });
  });

  describe('#compact', function() {
    it('compacts successfully', function(done) {
      db.put('boyoh', 'butcher', function(err) {
        db.compact(function(err) {
          assert(!err);
          done();
        });
      });
    });
  });

  describe('#createSnapshot', function () {
    var snapshot
    before(function (done) {
      db.put('beep', 'boop', function () {
        db.put('beep2', 'boop2', function () {
          snapshot = db.createSnapshot()
          db.remove('beep', function () {
            db.put('beep2', 'bong', done);
          });
        });
      });
    });

    describe('#get', function () {
      it('successfully retrieves a value', function (done) {
        db.get('beep', snapshot, function (err, value) {
          assert.equal(value.toString(), 'boop');
          db.get('beep2', snapshot, function (err, value2) {
            assert.equal(value2.toString(), 'boop2');
            done();
          });
        });
      });
      describe('not using snapshot', function () {
        it('successfully retrieves a value', function (done) {
          db.get('beep', function (err, value) {
            assert.equal(value, undefined);
            db.get('beep2', function (err, value2) {
              assert.equal(value2.toString(), 'bong');
              done();
            });
          });
        });
      });
    });

    describe('#compact', function (done) {
      before(function (done) {
        db.compact(done);
      });

      describe('#get', function () {
        it('successfully retrieves a value', function (done) {
          db.get('beep', snapshot, function (err, value) {
            assert(!err, 'should not Error');
            assert.equal(value.toString(), 'boop');
            db.get('beep2', snapshot, function (err, value2) {
              assert.equal(value2.toString(), 'boop2');
              done();
            });
          });
        });
      });
    });

    describe('snapshot#close', function (done) {
      before(function (done) {
        snapshot.close();
        done();
      });

      describe('#get', function () {
        it('returns error about snapshot being closed', function (done) {
          db.get('beep', snapshot, function (err) {
            assert(err instanceof Error);
            assert.equal(err.message, 'Snapshot is closed');
            done();
          });
        });
      });
    });
  });

  it('successfully writes large amounts of data', function(done) {
    var max = 5000;
    var put = function(index) {
      if (index === max) {
        return done();
      }

      var key = new Buffer(500);
      var val = new Buffer(500);

      key.fill(index.toString());
      val.fill('v');

      db.put(key, val, function(err) {
        assert(!err);
        put(++index);
      });
    }

    put(0);
    
  });

  after(function(done) {
    db.close(done);
  });
});

describe('Multiple time overwriting same key and compact', function () {
  before(function (done) {
    require('rimraf')(directory, function () {
      db = new Medea({ maxFileSize: 100 });
      db.open(directory, done)
    });
  });

  for(var i = 0; i < 10; i++) {
    it('successfully overwriting same key', function (done) {
      var buffer1 = new Buffer(50),
        buffer2 = new Buffer(50),
        buffer3 = new Buffer(50);

      buffer1.fill(1);
      buffer2.fill(2);
      buffer3.fill(3);

      db.put('foo1', buffer1, function () {
        db.put('foo1', buffer2, function () {
          db.put('foo1', buffer3, function () {
            db.compact(function (err) {
              if (err) return done(err)
              db.compact(function (err) {
                if (err) return done(err)

                db.get('foo1', function (err, value) {
                  assert.deepEqual(value, buffer3);
                  done();
                })
              });
            });
          });
        });
      });
    });
  }

  after(function (done) {
    db.close(done);
  });
});

describe('Multiple time overwriting same key and compact', function () {
  before(function (done) {
    require('rimraf')(directory, function () {
      db = new Medea({ maxFileSize: 100 });
      db.open(directory, done)
    });
  });

  for(var i = 0; i < 10; i++) {
    it('successfully writing different key', function (done) {
      var buffer1 = new Buffer(50),
        buffer2 = new Buffer(50),
        buffer3 = new Buffer(50);

      buffer1.fill(1);
      buffer2.fill(2);
      buffer3.fill(3);

      db.put('foo1', buffer1, function () {
        db.put('foo2', buffer2, function () {
          db.put('foo3', buffer3, function () {
            db.compact(function (err) {
              if (err) return done(err)
              db.compact(function (err) {
                if (err) return done(err)
                db.get('foo1', function (err, value) {
                  assert.deepEqual(value, buffer1);
                  db.get('foo2', function (err, value) {
                    assert.deepEqual(value, buffer2);
                    db.get('foo3', function (err, value) {
                      assert.deepEqual(value, buffer3);

                      done()
                    });
                  });
                })
              });
            });
          });
        });
      });
    });
  }

  after(function (done) {
    db.close(done);
  });
});

describe('Medea#open() and then directly #close()', function () {
  it('should not error', function (done) {
    db = new Medea({});
    db.open(directory, function(err) {
      db.close(done)
    });
  })
})
