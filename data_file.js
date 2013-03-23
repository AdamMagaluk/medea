var fs = require('fs');
var constants = require('./constants');
var fileops = require('./fileops');
var sizes = constants.sizes;

var HintFile = function() {
  this.filename = null;
  this.fd = null;
  this.offset = 0;
};

var DataFile = module.exports = function() {
  this.dirname = null;
  this.filename = null;
  this.fd = null;
  this.offset = 0;
  this.hintFd = null;
  this.readOnly = true;
  this.hintCrc = new Buffer(sizes.crc);
  this.hintOffset = 0;
  this.timestamp = null;
  this.writeLock = null;
};

DataFile.create = function(dirname, cb) {
  fileops.ensureDir(dirname, function(err) {
    fileops.mostRecentTstamp(dirname, function(err, stamp) {
      stamp = stamp + 1;
      var filename = dirname + '/' + stamp + '.medea.data';

      var file = new DataFile();
      file.filename = filename;

      fileops.open(file, function(err, val1) {
        if (err) {
          cb(err);
          return;
        }
        var hintFilename = dirname + '/' + stamp + '.medea.hint';
        var hintFile = new HintFile();
        hintFile.filename = hintFilename;
        fileops.open(hintFile, function(err, val2) {
          if (err) {
            cb(err)
            return;
          }

          file.dirname = dirname;
          file.readOnly = false;
          file.fd = val1.fd;
          file.hintFd = val2.fd;
          file.hintOffset = 0;
          file.offset = 0;
          file.timestamp = stamp;

          if (cb) cb(null, file);
        });
      });
    });
  });
};

DataFile.createSync = function(dirname) {
  var stamp = fileops.mostRecentTstampSync(dirname);
  stamp = stamp + 1;
  var filename = dirname + '/' + stamp + '.medea.data';
  var file = new DataFile();
  file.filename = filename;
  var val1 = fileops.openSync(file)

  var hintFilename = dirname + '/' + stamp + '.medea.hint';
  var hintFile = new HintFile();
  hintFile.filename = hintFilename;
  var val2 = fileops.openSync(hintFile);

  file.readOnly = false;
  file.fd = val1.fd;
  file.hintFd = val2.fd;
  file.offset = 0;
  file.hintOffset = 0;
  file.timestamp = stamp;

  return file;
};

DataFile.prototype.write = function(bufs, cb) {
  /*var stream = fs.createWriteStream(this.filename, { flags: 'a', fd: this.fd });
  stream.on('error', function(err) {
    if (cb) cb(err);
  });
  stream.write(bufs, cb);*/
  fs.write(this.fd, bufs, 0, bufs.length, this.offset, cb);
};

DataFile.prototype.writeHintFile = function(bufs, cb) {
  /*var filename = this.dirname + '/' + this.timestamp + '.medea.hint';
  var stream = fs.createWriteStream(filename, { flags: 'a', fd: this.hintFd });
  stream.on('error', function(err) {
    if (cb) cb(err);
  });
  stream.write(bufs, cb);*/
  fs.write(this.hintFd, bufs, 0, bufs.length, this.hintOffset, cb);
};

DataFile.prototype.writeSync = function(bufs) {
  return fs.writeSync(this.fd, bufs, 0, bufs.length, 0);
};


DataFile.prototype.closeForWriting = function(cb) {
  if (this.offset === 0 || this.readOnly) {
    if (cb) cb();
    return;
  }

  if (this.hintFd) {
    this._closeHintFile(function() {
      if (cb) cb();
    });
  } else {
    if (cb) cb();
  }
};

DataFile.prototype.closeForWritingSync = function() {
  if (this.offset === 0 || this.readOnly) {
    return;
  }

  if (this.hintFd) {
    this._closeHintFileSync();
  }
};

DataFile.prototype._closeHintFile = function(cb) {
  if (!this.hintFd || this.closingHintFile) {
    if (cb) cb();
    return;
  }

  this.closingHintFile = true;
  var hintFilename = this.dirname + '/' + this.timestamp + '.medea.hint';
  
  var crcBuf = new Buffer(sizes.crc);
  this.hintCrc.copy(crcBuf, 0, 0, this.hintCrc.length);

  var that = this;
  this.writeHintFile(crcBuf, function() {
    fs.fsync(that.hintFd, function(err) {
      if (err) {
        console.log('Error fsyncing hint file during close.', err);
        if (cb) cb(err);
        return;
      }
      fs.close(that.hintFd, function(err) {
        that.hintFd = null;
        that.hintCrc = new Buffer(sizes.crc);
        if (cb) cb();
      });
    });
  });
};

DataFile.prototype._closeHintFileSync = function() {
  if (!this.hintFd || this.closingHintFile) {
    if (cb) cb();
    return;
  }

  this.closingHintFile = true;
  var hintFilename = this.dirname + '/' + this.timestamp + '.medea.hint';
  
  var crcBuf = new Buffer(sizes.crc);
  this.hintCrc.copy(crcBuf, 0, 0, this.hintCrc.length);

  var that = this;
  this.writeSync(hintFilename, this.hintFd, crcBuf);
  fs.fsyncSync(this.hintFd);
  fs.closeSync(this.hintFd);
  this.hintFd = null;
  this.hintCrc = new Buffer(sizes.crc);
};
