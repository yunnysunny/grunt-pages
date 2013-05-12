var fs = require('fs');
var path = require('path');
var marked = require('marked');
var hljs = require('highlight.js');
var colors = require('colors');

var templateEngines = {
  jade: require('jade'),
  ejs: require('ejs')
};

module.exports = function (grunt) {
  'use strict';

  grunt.registerMultiTask('blog', 'Creates a blog.', function () {
    var options = this.options();
    var postsMetadata = [];
    var templateEngine;
    var metadataDelimeter = '----';

    if (this.data.src) {
      grunt.file.recurse(this.data.src, function (abspath) {
        var fileString = fs.readFileSync(abspath, 'utf8');
        if (fileString.indexOf(metadataDelimeter) === -1) {
          grunt.log.error('Error: there is no metadata for the file at: ' + abspath)
          return;
        }
        // Separate metadata from content
        var metadata = fileString.split(metadataDelimeter)[0].trim();
        var content = fileString.split(metadataDelimeter)[1];
        var metadataRows = metadata.replace(/ /g, '').split('\n');
        var metadataObject = {};

        // Add metadata to the post's metadata object
        metadataRows.forEach(function (metadataRow, index) {
          metadataObject[metadataRow.split(':')[0]] = metadataRow.split(':')[1];
        });

        // Parses markdown with syntax highlighting
        marked.setOptions({
          highlight: function (code) {
            return hljs.highlightAuto(code).value;
          },
          gfm: true
        });
        metadataObject.content = marked(content);

        // Create the url using the config and metadata
        var urlSegments = this.data.url.split('/:');
        var dest = options.devFolder + '/' + this.data.url + '.html';
        // Replace dynamic url segments
        urlSegments.forEach(function (segment) {
          if (segment in metadataObject) dest = dest.replace(':' + segment, escape(metadataObject[segment]));
        });
        metadataObject.url = dest.slice((options.devFolder + '/').length);

        if (this.data.layout) {
          templateEngine = templateEngines[path.extname(this.data.layout).slice(1)];
          var layoutString = fs.readFileSync(this.data.layout, 'utf8');
          var fn = templateEngine.compile(layoutString, { filename: this.data.layout });
          grunt.file.write(dest, fn(metadataObject));
          grunt.log.ok('Created ' + 'post'.blue + ' at: ' + dest);
        } else {
          grunt.file.write(dest, metadataObject.content);
        }
        postsMetadata.push(metadataObject);

      }.bind(this));
    }

    // If the user wants to inject blog data into a page, render the page templates with the post metadata
    if (options.pageSrc) {
      grunt.file.recurse(options.pageSrc, function (abspath, rootdir) {
        var layoutString = fs.readFileSync(abspath, 'utf8');
        var fn = templateEngine.compile(layoutString, { filename: abspath });
        var dest = options.devFolder + '/' + abspath.slice(rootdir.length + 1).replace(path.extname(abspath), '.html');
        grunt.log.ok('Created ' + 'page'.magenta + ' at: ' + dest);
        grunt.file.write(dest, fn({ posts: postsMetadata }));
      }.bind(this));
    }

  });
};
