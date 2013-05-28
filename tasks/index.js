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
  var postCollection = [];
  var templateEngine;

  grunt.registerMultiTask('pages', 'Creates pages from markdown and templates.', function () {
    done = this.async();
    options = this.options();

    if (this.data.src) {
      var numPosts = grunt.file.expand({ filter: 'isFile' }, this.data.src + '/**').length;
      var parsedPosts = 0;

      grunt.file.recurse(this.data.src, function (abspath) {
        var post = parsePostData(abspath);
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
          post.dest = getPostDest(this, post, abspath);
          post.url = post.dest.slice((this.data.dest + '/').length);
          postCollection.push(post);

          // Once all the source posts are parsed, we can generate the html posts
          if (++parsedPosts === numPosts) {
            generatePosts(this, postCollection);
            // If the user wants to inject post data into a page, render the page templates with the posts' data
            if (options.pageSrc) {
              generatePages(this, postCollection);
            }
            done();
          }
        }.bind(this));
      }.bind(this));
    }
  });

  /**
   * Parses the metadata and content from a post
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
   * @param  {Object} postData
   * @param  {String} abspath
   * @return {String}
   */
  function getPostDest (that, postData, abspath) {
    var dest;
    var dynamicUrlSegments = that.data.url.split('/:');
    // Ignore the static section of the url
    if (that.data.url[0] !== ':') dynamicUrlSegments.shift();
    dest = that.data.dest + '/' + that.data.url + '.html';
    // Replace dynamic url segments
    dynamicUrlSegments.forEach(function (segment) {
      if (segment in postData) {
        dest = dest.replace(':' + segment, postData[segment].replace(/[^a-zA-Z0-9]/g, '-'));
      } else {
        grunt.log.error('Required ' + segment.red + ' attribute not found in ' + 'post'.blue + 'metadata at ' + abspath + '.');
        return;
      }
    });
    return dest;
  }

  /**
   * Generates posts based on the provided data
   * @param  {Object} postsData
   * @return {null}
   */
  function generatePosts (that, postsData) {
    if (that.data.layout) {
      // Sort posts by descending date
      postsData.sort(function (a, b) {
        return b.date - a.date;
      });

      postsData.forEach(function (metadata) {
        // Determine the template engine based on the file's extention name
        templateEngine = templateEngines[path.extname(that.data.layout).slice(1)];
        var layoutString = fs.readFileSync(that.data.layout, 'utf8');
        var fn = templateEngine.compile(layoutString, { pretty: true, filename: that.data.layout });
        grunt.file.write(metadata.dest, fn(metadata));
        grunt.log.ok('Created ' + 'post'.blue + ' at: ' + metadata.dest);
      });
    } else {
      grunt.log.error('Please specify a post layout.');
      done();
    }
  }

  /**
   * Genereates pages using the posts' data
   * @param  {Object} postsData
   * @return {null}
   */
  function generatePages (that, postsData) {
    grunt.file.recurse(options.pageSrc, function (abspath, rootdir) {
      var layoutString = fs.readFileSync(abspath, 'utf8');
      var fn = templateEngine.compile(layoutString, { pretty: true, filename: abspath });
      var dest = that.data.dest + '/' +
                 abspath.slice(rootdir.length + 1).replace(path.extname(abspath), '.html');
      grunt.log.ok('Created ' + 'page'.magenta + ' at: ' + dest);
      grunt.file.write(dest, fn({ posts: postsData }));
    });
  }
};
