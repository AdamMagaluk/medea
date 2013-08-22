var assert = require('assert');
var fs = require('fs');
var rimraf = require('rimraf');
var DataFile = require('../data_file');

var directory = __dirname + '/tmp/data_file_test';

describe('DataFile', function() {
  describe('.create', function() {
    it('creates a data file asynchronously', function(done) {
      DataFile.create(directory, function(err, file) {
        assert(file.dirname, directory);
        assert(!!file.fd);
        assert(!!file.hintFd);
        assert(!!file.filename);

        done();
      });
    });

    it('elevates data file open errors', function(done) {
      var coreOpen = fs.open;
      fs.open = function(filename, mode, cb) {
        cb(new Error('OHNOES!'));
      };
      DataFile.create(directory, function(err, file) {
        assert.equal(err.message, 'OHNOES!');
        fs.open = coreOpen;
        done();
      });
    });

    it('elevates hint file open errors', function(done) {
      var coreOpen = fs.open;
      var counter = 0;
      fs.open = function(filename, mode, cb) {
        counter++;
        if (counter === 2) {
          cb(new Error('OHNOES!'));
        } else {
          coreOpen(filename, mode, cb);
        }
      };
      DataFile.create(directory, function(err, file) {
        assert.equal(err.message, 'OHNOES!');
        fs.open = coreOpen;
        done();
      });
    });
  });

  describe('.createSync', function() {
    it('creates a data file synchronously', function() {
      var file = DataFile.createSync(directory);
      assert(file.dirname, directory);
      assert(!!file.fd);
      assert(!!file.hintFd);
      assert(!!file.filename);
    });
  });

  describe('#write', function() {
    it('writes buffers asynchronously', function(done) {
      DataFile.create(directory, function(err, file) {
        var buf = new Buffer('hotdogmania');
        file.write(buf, function(err) {
          assert(!err);
          done();
        });
      });
    });
  });

  describe('#writeHintFile', function() {
    it('writes buffers asynchronously', function(done) {
      DataFile.create(directory, function(err, file) {
        var buf = new Buffer('hotdogmania');
        file.writeHintFile(buf, function(err) {
          assert(!err);
          done();
        });
      });
    });
  });

  describe('#writeSync', function() {
    it('writes buffers synchronously', function() {
      var file = DataFile.createSync(directory);
      var buf = new Buffer('soup');
      var ret = file.writeSync(buf);
      assert(!!ret);
    });
  });

  describe('#closeForWriting', function() {
    it('closes the file when data has been written', function(done) {
      DataFile.create(directory, function(err, file) {
        var buf = new Buffer('hotdogmania');
        file.write(buf, function(err) {
          file.offset = buf.length;
          file.closeForWriting(function(err) {
            assert(!err);
            done();
          });
        });
      });
    });

    it('closes the file when data has not been written', function(done) {
      DataFile.create(directory, function(err, file) {
        file.closeForWriting(function(err) {
          assert(!err);
          done();
        });
      });
    });

    it('elevates errors on data file fsync', function(done) {
      DataFile.create(directory, function(err, file) {
        var buf = new Buffer('hotdogmania');
        file.write(buf, function(err) {
          file.offset = buf.length;
          file.fd = -1;
          file.closeForWriting(function(err) {
            assert(err.code, 'EBADF');
            done();
          });
        });
      });
    });

    it('elevates errors on hint file fsync', function(done) {
      DataFile.create(directory, function(err, file) {
        var buf = new Buffer('hotdogmania');
        file.write(buf, function(err) {
          file.offset = buf.length;
          file.hintFd = -1;
          file.closeForWriting(function(err) {
            assert(err.code, 'EBADF');
            done();
          });
        });
      });
    });

    it('continues to close the file when no hint file exists', function(done) {
      DataFile.create(directory, function(err, file) {
        var buf = new Buffer('hotdogmania');
        file.write(buf, function(err) {
          file.offset = buf.length;
          file.hintFd = null;
          file.closeForWriting(function(err) {
            assert(!err);
            done();
          });
        });
      });
    });

    it('completes the operation even if the file is readonly', function(done) {
      DataFile.create(directory, function(err, file) {
        var buf = new Buffer('hotdogmania');
        file.write(buf, function(err) {
          file.offset = buf.length;
          file.hintFd = null;
          file.readOnly = true;
          file.closeForWriting(function(err) {
            assert(!err);
            done();
          });
        });
      });
    });

    it('handles overlapping close operations', function(done) {
      DataFile.create(directory, function(err, file) {
        var buf = new Buffer('hotdogmania');
        file.write(buf, function(err) {
          file.offset = buf.length;
          file.hintFd = null;
          file.closeForWriting(function(err) {
            file.closeForWriting(function(err) {
              assert(!err);
              done();
            });
          });
        });
      });
    });
  });

  describe('#closeForWritingSync', function() {
    it('closes the file when data has been written', function() {
      var file = DataFile.createSync(directory);
      var buf = new Buffer('hotdogmania');
      file.writeSync(buf);
      file.offset = buf.length;
      file.closeForWritingSync();

      assert.equal(file.hintFd, null);
    });

    it('closes the file when data has not been written', function() {
      var file = DataFile.createSync(directory);
      file.closeForWritingSync();
      assert.equal(file.hintFd, null);
    });

    it('completes the operation even if the file is readonly', function() {
      var file = DataFile.createSync(directory);
      var buf = new Buffer('hotdogmania');
      file.writeSync(buf);
      file.offset = buf.length;
      file.readOnly = true;
      file.closeForWritingSync();

      assert(!!file.hintFd);
    });

    it('handles overlapping close operations', function() {
      var file = DataFile.createSync(directory);
      var buf = new Buffer('hotdogmania');
      file.writeSync(buf);
      file.offset = buf.length;
      file.closeForWritingSync();
      file.closeForWritingSync();

      assert(!file.hintFd);
    });
  });

  /*after(function(done) {
    rimraf(directory, function() {
      done();
    });
  });*/
});
