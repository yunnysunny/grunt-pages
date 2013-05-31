var fs = require('fs');
require('should');
var spawn = require('child_process').spawn;

describe('When the grunt blog task is run', function () {

  before(function (done) {
    var buildProcess = spawn('grunt', ['pages:posts']);
    buildProcess.stdout.on('close', function () {
      done();
    });
  });

  it('creates posts in the location specified by the url', function() {
    fs.existsSync('dev/blog/posts/Post-1.html').should.be.ok;
    fs.existsSync('dev/blog/posts/Post-2.html').should.be.ok;
  });

  it('creates posts using the markdown content', function () {
    fs.readFileSync('dev/blog/posts/Post-1.html', 'utf8').should.equal(fs.readFileSync('test/output/blog/posts/Post1.html', 'utf8'));
    fs.readFileSync('dev/blog/posts/Post-2.html', 'utf8').should.equal(fs.readFileSync('test/output/blog/posts/Post2.html', 'utf8'));
  });

  it('creates pages in the location specified by the url', function() {
    fs.existsSync('dev/blog/index.html').should.be.ok;
    fs.existsSync('dev/index.html').should.be.ok;
  });

  it('creates pages using the page content', function () {
    fs.readFileSync('dev/index.html', 'utf8').should.equal(fs.readFileSync('test/output/index.html', 'utf8'));
    fs.readFileSync('dev/blog/index.html', 'utf8').should.equal(fs.readFileSync('test/output/blog/index.html', 'utf8'));
  });

});

describe('When the grunt blog task is run with pagination', function () {

  before(function (done) {
    var buildProcess = spawn('grunt', ['pages:paginated']);
    buildProcess.stdout.on('close', function () {
      done();
    });
  });

  it('creates pages in the expected location', function() {
    fs.existsSync('dev/blog/index.html').should.be.ok;
    fs.existsSync('dev/blog/page/1/index.html').should.be.ok;
  });

  it('creates the root list page', function () {
    fs.readFileSync('dev/blog/index.html', 'utf8').should.equal(fs.readFileSync('test/output/blog/paginatedIndex.html', 'utf8'));
  });

  it('creates the paginated list page', function () {
    fs.readFileSync('dev/blog/page/1/index.html', 'utf8').should.equal(fs.readFileSync('test/output/blog/page/1/index.html', 'utf8'));
  });

});
