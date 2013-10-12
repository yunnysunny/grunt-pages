var fs = require('fs');
require('should');
var exec = require('child_process').exec;

describe('grunt-pages', function () {

  // Build test targets before running tests
  before(function (done) {

    var builds = 0;
    exec('grunt pages:target1', function () {
      if (++builds === 3) {
        done();
      }
    });

    exec('grunt pages:target2', function () {
      if (++builds === 3) {
        done();
      }
    });

    exec('grunt pages:target3', function () {
      if (++builds === 3) {
        done();
      }
    });
  });

  it('should create posts in the `dest` folder using the `url` as a relative path ' +
     'replacing :variables with post metadata and formatting the metadata string using the default formatting function, ' +
     'then adding .html or index.html', function() {
    fs.existsSync('dest1/blog/posts/post-1/index.html').should.eql(true, 'First post created in correct location.');
    fs.existsSync('dest1/blog/posts/post-2/index.html').should.eql(true, 'Second post created in correct location.');
  });

  it('should create posts with the compiled markdown source and metdata rendered by a template engine', function () {
    fs.readFileSync('dest1/blog/posts/post-1/index.html', 'utf8').should.eql(fs.readFileSync('test/fixtures/integration/output/target1/blog/posts/post-1/index.html', 'utf8').replace(/<date>.*?<\/date>/g, '<date>' + new Date('5-12-2013') + '</date>'));
    fs.readFileSync('dest1/blog/posts/post-2/index.html', 'utf8').should.eql(fs.readFileSync('test/fixtures/integration/output/target1/blog/posts/post-2/index.html', 'utf8').replace(/<date>.*?<\/date>/g, '<date>' + new Date(fs.statSync('test/fixtures/integration/input/posts/post2.md').mtime) + '</date>'));
  });

  it('should ignore _ prefixed draft posts', function () {
    fs.existsSync('dest1/blog/posts/Draft.html').should.eql(false, 'Draft posts should not be generated.');
  });

  it('should cache posts after they have been parsed', function () {
    var posts = JSON.parse(fs.readFileSync('.target1-post-cache.json')).posts;
    posts[0].sourcePath.should.equal('test/fixtures/integration/input/posts/post2.md');
    posts[1].sourcePath.should.equal('test/fixtures/integration/input/posts/post1.md');
  });

  describe('when specifying `options.pageSrc`', function () {

    it('should create pages in the `dest` folder using the page\'s relative path inside of the `options.pageSrc` folder, replacing the page template\'s extension with .html', function() {
      fs.existsSync('dest1/blog/index.html').should.eql(true, 'blog/index.ejs created in correct location.');
      fs.existsSync('dest1/index.html').should.eql(true, 'index.ejs created in correct location.');
    });

    it('should create pages with the expected content by rendering the page templates with the posts\' data', function () {
      fs.readFileSync('dest1/index.html', 'utf8').should.equal(fs.readFileSync('test/fixtures/integration/output/target1/index.html', 'utf8'));
      fs.readFileSync('dest1/blog/index.html', 'utf8').should.equal(fs.readFileSync('test/fixtures/integration/output/target1/blog/index.html', 'utf8'));
    });
  });

  describe('when specifying `options.data` as an Object', function () {

    it('should pass the `options.data` Object to the pages for rendering', function () {
      fs.readFileSync('dest2/test.html', 'utf8').should.include('data sourced from object');
    });
  });

  describe('when specifying `options.data` as a String', function () {

    it('should read the JSON file specified by the String\'s pathname and pass it to the pages for rendering', function () {
      fs.readFileSync('dest1/index.html', 'utf8').should.include('data sourced from file');
    });
  });

  describe('when specifying `options.sortFunction`', function () {

    it('should sort posts according to the provided sort function', function () {
      fs.readFileSync('dest2/blog/index.html', 'utf8').should.include('Post 1', 'Root list page should have older post first due to options.sortFunction.');
    });
  });

  describe('when specifying `options.formatPostUrl`', function () {

    it('should format URLs according to the specified function', function () {
      fs.existsSync('dest2/blog/posts/Post_1/index.html').should.eql(true, 'First post created in correct location.');
      fs.existsSync('dest2/blog/posts/Post_2/index.html').should.eql(true, 'Second post created in correct location.');
    });
  });

  describe('when specifying `options.templateEngine`', function () {

    it('should ignore pages that do not have that template engine\'s file extension(s)', function () {
      fs.existsSync('dest1/ignored.html').should.eql(false, '.jade page not generated when the options.templateEngine is set to EJS.');
    });
  });

  function stripDate (str) {
    return str.replace(/<lastBuildDate>.*?<\/lastBuildDate>/, '')
              .replace(/<pubDate>.*?<\/pubDate>/g, '');
  }

  describe('when specifying `options.rss` with the default required properties', function () {

    it('should create feed.xml from the posts', function () {
      var fileSuffix = '';
      if (process.env.NODE_ENV === 'ci') {
        fileSuffix = '-ci';
      }

      stripDate(fs.readFileSync('dest1/feed.xml', 'utf8')).should.equal(stripDate(fs.readFileSync('test/fixtures/integration/output/target1/feed' + fileSuffix + '.xml', 'utf8')));
    });
  });

  describe('when specifying `options.rss` with custom properties', function () {

    it('should create an xml file in the location specified by `options.rss.path` from the posts', function () {
      var fileSuffix = '';
      if (process.env.NODE_ENV === 'ci') {
        fileSuffix = '-ci';
      }
      stripDate(fs.readFileSync('dest2/rss/rss.xml', 'utf8')).should.equal(stripDate(fs.readFileSync('test/fixtures/integration/output/target2/rss/rss' + fileSuffix + '.xml', 'utf8')));
    });
  });

  describe('when specifying `options.pagination`', function () {

    describe('when specifying `options.pagination.postsPerPage`', function () {

      it('should create the root list page as index.html inside of `dest`', function() {
        fs.existsSync('dest3/index.html').should.eql(true, 'Root list page for default pagination scheme.');
      });

      it('should create the non-root list page relative to `dest` using the default pagination url scheme', function () {
        fs.existsSync('dest3/page/1/index.html', 'utf8').should.eql(true, 'Non-root list page for default pagination scheme.');
      });

      it('should create the root list page with the expected post group based on `options.pagination.postsPerPage`', function () {
        fs.readFileSync('dest3/index.html', 'utf8').should.equal(fs.readFileSync('test/fixtures/integration/output/target3/index.html', 'utf8'));
      });

      it('should create the non-root list page with the expected post group based on `options.pagination.postsPerPage`', function () {
        fs.readFileSync('dest3/page/1/index.html', 'utf8').should.equal(fs.readFileSync('test/fixtures/integration/output/target3/page/1/index.html', 'utf8'));
      });
    });

    describe('when specifying `options.pageSrc`', function () {

      it('should create the root list page relative to `options.pageSrc` inside of `dest`', function() {
        fs.existsSync('dest2/blog/index.html').should.eql(true, 'Root list page for custom url pagination scheme.');
      });

      it('should create the non-root list page relative to `options.pageSrc` inside of `dest`', function() {
        fs.existsSync('dest2/blog/index.html').should.eql(true, 'Root list page for custom url pagination scheme.');
      });

    });

    describe('when specifying `options.pagination.url`', function () {

      it('should create list pages using the `options.pagination.url` scheme', function () {
        fs.existsSync('dest2/blog/list/1/index.html').should.eql(true, 'First page for the custom pagination scheme.');
      });
    });

    describe('when specifying `options.pagination.getPostGroups`', function () {

      it('should create custom list pages inside of `dest` using the URLs returned from `options.pagination.getPostGroups`', function () {
        fs.existsSync('dest2/blog/page/javascript/index.html').should.eql(true, 'List page for posts with javascript tag.');
        fs.existsSync('dest2/blog/page/tips/index.html').should.eql(true, 'List page for posts with tips tag.');
        fs.existsSync('dest2/blog/page/tutorial/index.html').should.eql(true, 'List page for posts with tutorial tag.');
      });

      it('should create list pages with custom post groups', function () {
        fs.readFileSync('dest2/blog/page/javascript/index.html', 'utf8').should.equal(fs.readFileSync('test/fixtures/integration/output/target2/page/javascript/index.html', 'utf8'));
      });
    });
  });
});
