var fs = require('fs');
var path = require('path');
var marked = require('marked');
var jsYAML = require('js-yaml');
var pygmentize = require('pygmentize-bundled');
require('colors');

var templateEngines = {
  jade: require('jade'),
  ejs: require('ejs')
};

module.exports = function (grunt) {
  'use strict';

  grunt.registerMultiTask('pages', 'Creates pages from markdown and templates.', function () {
    var done = this.async();
    var options = this.options();
    var postsMetadata = [];
    var templateEngine;

    if (this.data.src) {
      var numPosts = grunt.file.expand({ filter: 'isFile' }, this.data.src + '/**').length;
      var generatedPosts = 0;
      grunt.file.recurse(this.data.src, function (abspath) {
        var fileString = fs.readFileSync(abspath, 'utf8');
        var metadata;
        var content;
        // Parse the metadata and content from the post
        try {
          // Parse JSON metadata
          if (fileString.indexOf('{') === 0) {
            metadata = eval('(' + fileString.substr(0, fileString.indexOf('}') + 1) + ')');
            metadata.date = new Date(metadata.date);
            content = fileString.slice(fileString.indexOf('}') + 1);
          // Parse YAML metadata
          } else if (fileString.indexOf('----') === 0) {
            metadata = jsYAML.load(fileString.split('----')[1]);
            // Extract the content by removing the metadata section
            var sections = fileString.split('----');
            sections.shift();
            sections.shift();
            content = sections.join();
          } else {
            grunt.log.error('Error:'.red + ' the metadata for the following ' + 'post'.blue + ' is formatted incorrectly: ' + abspath.red);
            return;
          }
        } catch (e) {
          grunt.log.error(e);
          grunt.log.error('Error:'.red + ' the metadata for the following ' + 'post'.blue + ' is formatted incorrectly: ' + abspath.red);
          return;
        }
        var that = this;
        marked(content, {
          highlight: function (code, lang, callback) {
            pygmentize({ lang: lang, format: 'html' }, code, function (err, result) {
              callback(err, result.toString());
            });
          },
          gfm: true
        }, function (err, content) {
          metadata.content = content;
          // Create the url using the config and metadata
          var dynamicUrlSegments = that.data.url.split('/:');
          // Ignore the static section of the url
          if (that.data.url[0] !== ':') dynamicUrlSegments.shift();
          var dest = that.data.dest + '/' + that.data.url + '.html';
          // Replace dynamic url segments
          dynamicUrlSegments.forEach(function (segment) {
            if (segment in metadata) {
              dest = dest.replace(':' + segment, metadata[segment].replace(/[^a-zA-Z0-9]/g, '-'));
            } else {
              grunt.log.error('Required ' + segment.red + ' attribute not found in ' + 'post'.blue + 'metadata at ' + abspath + '.');
              return;
            }
          });

          // Remove the dest folder from the post's relative url
          metadata.url = dest.slice((that.data.dest + '/').length);

          if (that.data.layout) {
            // Determine the template engine based on the file's extention name
            templateEngine = templateEngines[path.extname(that.data.layout).slice(1)];
            var layoutString = fs.readFileSync(that.data.layout, 'utf8');
            var fn = templateEngine.compile(layoutString, { pretty: true, filename: that.data.layout });
            grunt.file.write(dest, fn(metadata));
            grunt.log.ok('Created ' + 'post'.blue + ' at: ' + dest);
          } else {
            grunt.file.write(dest, metadata.content);
          }
          postsMetadata.push(metadata);

          if (++generatedPosts === numPosts) {
            // If the user wants to inject blog data into a page, render the page templates with the post metadata
            if (options.pageSrc) {
              grunt.file.recurse(options.pageSrc, function (abspath, rootdir) {
                var layoutString = fs.readFileSync(abspath, 'utf8');
                var fn = templateEngine.compile(layoutString, { pretty: true, filename: abspath });
                var dest = that.data.dest + '/' + abspath.slice(rootdir.length + 1).replace(path.extname(abspath), '.html');
                grunt.log.ok('Created ' + 'page'.magenta + ' at: ' + dest);
                grunt.file.write(dest, fn({ posts: postsMetadata }));
              });
            }
            done();
          }
        });
      }.bind(this));
    }
  });
};
