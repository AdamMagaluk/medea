var assert = require('assert');
var crypto = require('crypto');
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

describe('Multiple files and compact', function () {
  before(function (done) {
    require('rimraf')(directory, function () {
      db = new Medea({ maxFileSize: 100 });
      db.open(directory, done)
    });
  });

  it('successfully overwriting same key', function (done) {
    db.put('foo1', new Buffer(100), function () {
      db.put('foo1', new Buffer(100), function () {
        db.put('foo1', new Buffer(100), function () {
          db.compact(function (err) {
            if (err) return done(err)
            db.compact(function (err) {
              if (err) return done(err)

              db.get('foo1', function (err, value) {
                assert(!!value);
                done()
              })
            });
          });
        });
      });
    });
  });

  it('successfully writing different key', function (done) {
    var buffer1 = crypto.randomBytes(100),
      buffer2 = crypto.randomBytes(100),
      buffer3 = crypto.randomBytes(100);

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
