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

  it('should create posts in the location specified by the url config property', function() {
    fs.existsSync('dev/blog/posts/Post_1/index.html').should.eql(true, 'First post created in correct location.');
    fs.existsSync('dev/blog/posts/Post_2/index.html').should.eql(true, 'Second post created in correct location.');
  });

  it('should create posts with the expected content by correctly parsing the metadata and markdown content and rendering the EJS layout template', function () {
    fs.readFileSync('dev/blog/posts/Post_1/index.html', 'utf8').should.equal(fs.readFileSync('test/fixtures/integration/output/blog/posts/Post1/index.html', 'utf8'));
    fs.readFileSync('dev/blog/posts/Post_2/index.html', 'utf8').should.equal(fs.readFileSync('test/fixtures/integration/output/blog/posts/Post2/index.html', 'utf8'));
  });

  it('should create pages in the location relative to the options.pageSrc replacing the extension with .html', function() {
    fs.existsSync('dev/blog/index.html').should.eql(true, 'blog/index.ejs created in correct location.');
    fs.existsSync('dev/index.html').should.eql(true, 'index.ejs created in correct location.');
  });

  it('should create pages with the expected content by rendering the page templates with the post data and options.data', function () {
    fs.readFileSync('dev/index.html', 'utf8').should.equal(fs.readFileSync('test/fixtures/integration/output/index.html', 'utf8'));
    fs.readFileSync('dev/blog/index.html', 'utf8').should.equal(fs.readFileSync('test/fixtures/integration/output/blog/index.html', 'utf8'));
  });

  it('should ignore _ prefixed draft posts', function () {
    fs.existsSync('dev/blog/posts/Draft.html').should.eql(false, 'Draft posts should not be generated.');
  });

  it('should cache posts after they have been parsed', function () {
    var posts = JSON.parse(fs.readFileSync('.posts-post-cache.json')).posts;
    posts[0].sourcePath.should.equal('test/fixtures/integration/input/posts/post2.md');
    posts[1].sourcePath.should.equal('test/fixtures/integration/input/posts/post1.md');
  });

  describe('when run with the RSS object set with default options', function () {

    before(function (done) {
      var buildProcess = spawn('grunt', ['pages:rss_default']);
      buildProcess.on('close', function () {
        done();
      });
    });

    it('should create feed.xml from the posts and default options', function () {
      var fileSuffix = '';
      if (process.env.NODE_ENV === 'ci') {
        fileSuffix = '-ci';
      }

      stripBuildDate(fs.readFileSync('dev/feed.xml', 'utf8')).should.equal(stripBuildDate(fs.readFileSync('test/fixtures/integration/output/feed' + fileSuffix + '.xml', 'utf8')));
    });
  });

  describe('when run with the RSS object set with custom options', function () {

    before(function (done) {
      var buildProcess = spawn('grunt', ['pages:rss_custom']);
      buildProcess.on('close', function () {
        done();
      });
    });

    it('should create rss.xml from the posts and provided options', function () {
      var fileSuffix = '';
      if (process.env.NODE_ENV === 'ci') {
        fileSuffix = '-ci';
      }
      stripBuildDate(fs.readFileSync('dev/rss/rss.xml', 'utf8')).should.equal(stripBuildDate(fs.readFileSync('test/fixtures/integration/output/rss/rss' + fileSuffix + '.xml', 'utf8')));
    });
  });

  describe('when run with the pagination config property set', function () {

    before(function (done) {
      var buildProcess = spawn('grunt', ['pages:paginated']);
      buildProcess.on('close', function () {
        done();
      });
    });

    it('should create paginated list pages in the expected location', function() {
      fs.existsSync('dev/index.html').should.eql(true, 'Root list page for default pagination scheme.');
      fs.existsSync('dev/list/1/index.html').should.eql(true, 'First page for default pagination scheme.');
      fs.existsSync('dev/page/javascript/index.html').should.eql(true, 'List page for posts with javascript tag.');
      fs.existsSync('dev/page/tips/index.html').should.eql(true, 'List page for posts with tips tag.');
      fs.existsSync('dev/page/tutorial/index.html').should.eql(true, 'List page for posts with tutorial tag.');
    });

    it('should create the custom list page with the expected content', function () {
      fs.readFileSync('dev/page/javascript/index.html', 'utf8').should.equal(fs.readFileSync('test/fixtures/integration/output/page/javascript/index.html', 'utf8'));
    });

    it('should create the root list page with the expected content', function () {
      fs.readFileSync('dev/index.html', 'utf8').should.equal(fs.readFileSync('test/fixtures/integration/output/blog/paginatedIndex.html', 'utf8'));
    });

    it('should create the paginated list page with the expected content', function () {
      fs.readFileSync('dev/list/1/index.html', 'utf8').should.equal(fs.readFileSync('test/fixtures/integration/output/list/1/index.html', 'utf8'));
    });
  });
});
