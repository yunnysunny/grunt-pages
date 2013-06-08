'use strict';
var fs = require('fs');
var path = require('path');
var jsYAML = require('js-yaml');
var marked = require('marked');
var pygmentize = require('pygmentize-bundled');
require('colors');

var templateEngines = {
  jade: require('jade'),
  ejs: require('ejs')
};

module.exports = function (grunt) {
  var done;
  var options;
  var templateEngine;

  grunt.registerMultiTask('pages', 'Creates pages from markdown and templates.', function () {
    done = this.async();
    options = this.options();
    var numPosts = grunt.file.expand({ filter: 'isFile' }, this.data.src + '/**').length;
    var parsedPosts = 0;
    var postCollection = [];

    grunt.file.recurse(this.data.src, function (abspath) {
      var post = parsePostData(abspath);
      if (post.markdown.length <= 1) {
        grunt.log.error('Error:'.red + ' the following ' + 'post'.blue + ' is blank, please add some content to it or delete it: ' + abspath.red);
        done();
      }

      // Parse post using marked and pygmentize for highlighting
      marked(post.markdown, {
        highlight: function (code, lang, callback) {
          pygmentize({ lang: lang, format: 'html' }, code, function (err, result) {
            callback(err, result.toString());
          });
        },
        gfm: true
      }, function (err, content) {
        if (err) throw err;
        delete post.markdown;
        post.content = content;
        postCollection.push(post);

        // Once all the source posts are parsed, we can generate the html posts
        if (++parsedPosts === numPosts) {
          var templateData = { posts: postCollection };
          if (options.data) {
            templateData.data = JSON.parse(fs.readFileSync(options.data));
          }
          postCollection = generatePosts(this, templateData, abspath);

          if (options.pageSrc) {
            generatePages(this, templateData);
          }

          if (options.pagination) {
            paginate(this, postCollection);
          }

          done();
        }
      }.bind(this));
    }.bind(this));
  });

  /**
   * Parses the metadata and markdown from a post
   * @param  {String} abspath
   * @return {Object}
   */
  function parsePostData (abspath) {
    var fileString = fs.readFileSync(abspath, 'utf8');
    var postData = {};
    try {

      // Parse JSON metadata
      if (fileString.indexOf('{') === 0) {
        postData = eval('(' + fileString.substr(0, fileString.indexOf('}') + 1) + ')');
        postData.date = new Date(postData.date);
        postData.markdown = fileString.slice(fileString.indexOf('}') + 1);

      // Parse YAML metadata
      } else if (fileString.indexOf('----') === 0) {
        postData = jsYAML.load(fileString.split('----')[1]);

        // Extract the content by removing the metadata section
        var sections = fileString.split('----');
        sections.shift();
        sections.shift();
        postData.markdown = sections.join('----');
      } else {
        grunt.log.error('Error:'.red + ' the metadata for the following ' + 'post'.blue + ' is formatted incorrectly: ' + abspath.red);
        done();
      }
      return postData;
    } catch (e) {
      grunt.log.error(e);
      grunt.log.error('Error:'.red + ' the metadata for the following ' + 'post'.blue + ' is formatted incorrectly: ' + abspath.red);
      done();
    }
  }

  /**
   * Returns the post destination based on the url property and postData
   * @param  {Object} that
   * @param  {Object} postData
   * @param  {String} abspath
   * @return {String}
   */
  function getPostDest (that, postData, abspath) {
    var dest = that.data.dest + '/' + that.data.url + '.html';
    var dynamicUrlSegments = that.data.url.split('/')
    .filter(function (urlSegment) {
      return urlSegment.indexOf(':') !== -1;
    })
    .map(function (urlSegment) {
      return urlSegment.slice(urlSegment.indexOf(':') + 1);
    });

    // Replace dynamic url segments
    dynamicUrlSegments.forEach(function (urlSegment) {
      if (urlSegment in postData) {
        dest = dest.replace(':' + urlSegment, postData[urlSegment].replace(/[^a-zA-Z0-9]/g, '-'));
      } else {
        grunt.log.error('Error: required ' + urlSegment.red + ' attribute not found in ' + 'post'.blue + ' metadata at ' + abspath + '.');
        done();
      }
    });
    return dest;
  }

  /**
   * Generates posts based on the provided data
   * @param  {Object} that
   * @param  {Object} templateData
   * @return {Array}
   */
  function generatePosts (that, templateData, abspath) {
    var postCollection = templateData.posts;

    // Sort posts by descending date
    postCollection.sort(function (a, b) {
      return b.date - a.date;
    });

    // First determine all of the posts' urls
    postCollection.forEach(function (post) {
      var dest = getPostDest(that, post, abspath);
      post.url = dest.slice((that.data.dest + '/').length);
    });

    // Then create the posts
    postCollection.forEach(function (post) {
      templateData.post = post;
      var dest = getPostDest(that, post, abspath);

      // Determine the template engine based on the file's extention name
      templateEngine = templateEngines[path.extname(that.data.layout).slice(1)];
      var layoutString = fs.readFileSync(that.data.layout, 'utf8');
      var fn = templateEngine.compile(layoutString, { pretty: true, filename: that.data.layout });
      grunt.file.write(dest, fn(templateData));
      grunt.log.ok('Created '.green + 'post'.blue + ' at: ' + dest);
      delete templateData.post;
    });

    return postCollection;
  }

  /**
   * Generates pages using the posts' data
   * @param  {Object} that
   * @param  {Object} templateData
   * @return {null}
   */
  function generatePages (that, templateData) {
    var listPage;
    if (options.pagination) {
      listPage = options.pagination.listPage;
    }
    grunt.file.recurse(options.pageSrc, function (abspath, rootdir) {

      // Don't generate the paginated list page
      if (abspath !== listPage) {
        if (!options.templateEngine || (options.templateEngine && path.extname(abspath) === '.' + options.templateEngine)) {
          var layoutString = fs.readFileSync(abspath, 'utf8');
          var fn = templateEngine.compile(layoutString, { pretty: true, filename: abspath });
          var dest = that.data.dest + '/' +
                     abspath.slice(rootdir.length + 1).replace(path.extname(abspath), '.html');
          grunt.log.ok('Created '.green + 'page'.magenta + ' at: ' + dest);
          grunt.file.write(dest, fn(templateData));
        }
      }
    });
  }

  /**
   * Creates paginated pages with a specified number of posts per page
   * @param  {Object} that
   * @param  {Array} postCollection
   * @return {null}
   */
  function paginate (that, postCollection) {
    var postGroups = [];
    var postGroup;
    var postsPerPage = options.pagination.postsPerPage;
    var listPage = options.pagination.listPage;
    var baseUrl = '';

    if (options.pageSrc) {
      baseUrl = path.dirname(listPage.slice(options.pageSrc.length + 1).replace(path.extname(listPage)));
    }

    var i = 0;
    while ((postGroup = postCollection.slice( i * postsPerPage, (i + 1) * postsPerPage)).length) {
      postGroups.push(postGroup);
      i++;
    }

    var layoutString = fs.readFileSync(listPage, 'utf8');
    var fn = templateEngine.compile(layoutString, { pretty: true, filename: listPage });

    postGroups.forEach(function (postGroup, pageNumber) {
      var dest = that.data.dest + '/' ;

      // If the pageSrc option is used generate list pages relative to pageSrc
      if (options.pageSrc) {
        if (listPage.indexOf(options.pageSrc) !== -1) {
          dest += listPage.slice(options.pageSrc.length + 1);
        } else {
          grunt.log.error('Error: the listPage must be within the pageSrc directory');
          done();
        }
      }

      if (pageNumber === 0) {
        if (!options.pageSrc) {
          dest += 'index.html';
        } else {
          dest = dest.replace(path.extname(listPage), '.html');
        }
      } else {
        if (!options.pageSrc) {
          dest += 'page/' + pageNumber + '/index.html';
        } else {
          dest = dest.replace(path.basename(listPage), 'page/' + pageNumber + '/index.html');
        }
      }

      grunt.file.write(dest, fn({
        baseUrl: baseUrl,
        pageNumber: pageNumber,
        numPages: postGroups.length,
        posts: postGroup
      }));
      grunt.log.ok('Created '.green + 'paginated'.rainbow + ' page'.magenta + ' at: ' + dest);
    });
  }
};
