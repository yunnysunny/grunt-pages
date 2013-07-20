var fs = require('fs');
require('should');
var spawn = require('child_process').spawn;

describe('grunt-pages', function () {

  before(function (done) {
    var buildProcess = spawn('grunt', ['pages:posts']);
    buildProcess.stdout.on('close', function () {
      done();
    });
  });

  it('should create posts in the location specified by the url', function() {
    fs.existsSync('dev/blog/posts/Post_1.html').should.be.ok;
    fs.existsSync('dev/blog/posts/Post_2.html').should.be.ok;
  });

  it('should create posts by correctly parsing the markdown content', function () {
    fs.readFileSync('dev/blog/posts/Post_1.html', 'utf8').should.equal(fs.readFileSync('test/output/blog/posts/Post1.html', 'utf8'));
    fs.readFileSync('dev/blog/posts/Post_2.html', 'utf8').should.equal(fs.readFileSync('test/output/blog/posts/Post2.html', 'utf8'));
  });

  it('should create pages in the location specified by the url', function() {
    fs.existsSync('dev/blog/index.html').should.be.ok;
    fs.existsSync('dev/index.html').should.be.ok;
  });

  it('should create pages using the page content', function () {
    fs.readFileSync('dev/index.html', 'utf8').should.equal(fs.readFileSync('test/output/index.html', 'utf8'));
    fs.readFileSync('dev/blog/index.html', 'utf8').should.equal(fs.readFileSync('test/output/blog/index.html', 'utf8'));
  });

  it('should ignore _ prefixed draft posts', function () {
    fs.existsSync('dev/blog/posts/Draft.html').should.not.be.ok;
  });

  describe('when run with the pagination object set', function () {

    before(function (done) {
      var buildProcess = spawn('grunt', ['pages:paginated']);
      buildProcess.stdout.on('close', function () {
        done();
      });
    });

    it('should create pages in the expected location', function() {
      fs.existsSync('dev/index.html').should.be.ok;
      fs.existsSync('dev/list/1/index.html').should.be.ok;
      fs.existsSync('dev/page/javascript/index.html').should.be.ok;
      fs.existsSync('dev/page/tips/index.html').should.be.ok;
      fs.existsSync('dev/page/tutorial/index.html').should.be.ok;
    });

    it('should create the a custom list page with the expected content', function () {
      fs.readFileSync('dev/page/javascript/index.html', 'utf8').should.equal(fs.readFileSync('test/output/page/javascript/index.html', 'utf8'));
    });

    it('should create the root list page with the expected content', function () {
      fs.readFileSync('dev/index.html', 'utf8').should.equal(fs.readFileSync('test/output/blog/paginatedIndex.html', 'utf8'));
    });

    it('should create the paginated list page with the expected content', function () {
      fs.readFileSync('dev/list/1/index.html', 'utf8').should.equal(fs.readFileSync('test/output/list/1/index.html', 'utf8'));
    });

  });
});