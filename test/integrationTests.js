var fs = require('fs');
require('should');
var spawn = require('child_process').spawn;

function stripBuildDate(str) {
  return str.replace(/<lastBuildDate>.*?<\/lastBuildDate>/, '');
}

describe('grunt-pages', function () {

  before(function (done) {
    var buildProcess = spawn('grunt', ['pages:posts']);
    buildProcess.stdout.on('close', function () {
      done();
    });
  });

  it('should create posts in the location specified by the url', function() {
    fs.existsSync('dev/blog/posts/Post_1/index.html').should.be.ok;
    fs.existsSync('dev/blog/posts/Post_2/index.html').should.be.ok;
  });

  it('should create posts by correctly parsing the markdown content', function () {
    fs.readFileSync('dev/blog/posts/Post_1/index.html', 'utf8').should.equal(fs.readFileSync('test/output/blog/posts/Post1/index.html', 'utf8'));
    fs.readFileSync('dev/blog/posts/Post_2/index.html', 'utf8').should.equal(fs.readFileSync('test/output/blog/posts/Post2/index.html', 'utf8'));
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

  it('should cache posts after they have been parsed', function () {
    var post = JSON.parse(fs.readFileSync('.posts-post-cache.json')).posts[0];
    post.sourcePath.should.equal('test/fixtures/posts/post2.md');
  });

  describe('when ran with the RSS object set with default options', function () {

    before(function (done) {
      var buildProcess = spawn('grunt', ['pages:rss_default']);
      buildProcess.stdout.on('close', function () {
        done();
      });
    });

    it('should create feed.xml from the posts and default options', function () {
      stripBuildDate(fs.readFileSync('dev/feed.xml', 'utf8')).should.equal(stripBuildDate(fs.readFileSync('test/output/feed.xml', 'utf8')));
    });
  });

  describe('when run with the RSS object set with custom options', function () {

    before(function (done) {
      var buildProcess = spawn('grunt', ['pages:rss_custom']);
      buildProcess.stdout.on('close', function () {
        done();
      });
    });

    it('should create rss.xml from the posts and provided options', function () {
      stripBuildDate(fs.readFileSync('dev/rss/rss.xml', 'utf8')).should.equal(stripBuildDate(fs.readFileSync('test/output/rss/rss.xml', 'utf8')));
    });
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
