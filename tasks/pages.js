/*
 * grunt-pages
 * https://github.com/ChrisWren/grunt-pages
 *
 * Copyright (c) 2013 Chris Wren
 * Licensed under the MIT license.
 */

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

// Define lib object to attach library methods to
var lib = {};

module.exports = function (grunt) {

  // Allow for test objects to be used during unit testing
  var _this = grunt.testContext || {};
  var options = grunt.testOptions || {};

  var templateEngine;

  grunt.registerMultiTask('pages', 'Creates pages from markdown and templates.', function () {
    var done = this.async();

    _this = this;
    options = this.options();

    // Don't include draft posts or dotfiles when counting the number of posts
    var numPosts = grunt.file.expand({
      filter: 'isFile'
    }, [
      this.data.src + '/**',
      '!**/_**',
      '!**/.**'
    ]).length;

    var parsedPosts = 0;
    var postCollection = [];

    grunt.file.recurse(this.data.src, function (postpath) {

      // Don't include draft posts or dotfiles
      if (path.basename(postpath).indexOf('_') === 0 ||
          path.basename(postpath).indexOf('.') === 0) {
        return;
      }
      var post = lib.parsePostData(postpath);

      // Save source path for error logging in getPostDest
      post.sourcePath = postpath;
      if (post.markdown.length <= 1) {
        grunt.fail.fatal('the following post is blank, please add some content to it or delete it: ' + postpath.red);
      }

      marked.setOptions({
        highlight: function (code, lang, callback) {

          // Use [pygments](http://pygments.org/) for highlighting
          pygmentize({ lang: lang, format: 'html' }, code, function (err, result) {
            callback(err, result.toString());
          });
        },
        gfm: true,
        anchors: true
      });

      // Parse post using marked
      marked(post.markdown, function (err, content) {
        if (err) throw err;

        // Replace markdown source with content property
        post.content = content;
        delete post.markdown;

        postCollection.push(post);

        // Once all the source posts are parsed, we can generate the html posts
        if (++parsedPosts === numPosts) {
          var templateData = { posts: postCollection };

          if (options.data) {
            lib.setData(templateData);
          }

          lib.setPostDests(postCollection);
          lib.setPostUrls(postCollection);
          lib.sortPosts(postCollection);

          lib.generatePosts(templateData);

          if (options.pageSrc) {
            lib.generatePages(templateData);
          }

          if (options.pagination) {
            if (Array.isArray(options.pagination)) {
              options.pagination.forEach(function (pagination) {
                lib.paginate(templateData, pagination);
              });
            } else {
              lib.paginate(templateData, options.pagination);
            }
          }

          done();
        }
      });
    });
  });

  /**
   * Parses the metadata and markdown from a post
   * @param  {String} postPath Absolute path of the post to be parsed
   * @return {Object}
   */
  lib.parsePostData = function (postPath) {
    var fileString = fs.readFileSync(postPath, 'utf8');
    var postData = {};
    try {

      // Parse JSON metadata
      if (fileString.indexOf('{') === 0) {
        postData = eval('(' + fileString.substr(0, fileString.indexOf('\n}') + 2) + ')');
        postData.date = new Date(postData.date);
        postData.markdown = fileString.slice(fileString.indexOf('\n}') + 2);

      // Parse YAML metadata
      } else if (fileString.indexOf('----') === 0) {
        postData = jsYAML.load(fileString.split('----')[1]);

        // Extract the content by removing the metadata section
        var sections = fileString.split('----');
        sections.shift();
        sections.shift();
        postData.markdown = sections.join('----');
      } else {
        grunt.fail.fatal('the metadata for the following post is formatted incorrectly: ' + postPath.red);
      }
      return postData;
    } catch (e) {
      grunt.fail.fatal('the metadata for the following post is formatted incorrectly: ' + postPath.red);
    }
  };

  /**
   * Updates the template data with the data from an Object or JSON file
   * @param {object} templateData
   */
  lib.setData = function (templateData) {
    if (typeof options.data === 'string') {
      try {
        templateData.data = JSON.parse(fs.readFileSync(options.data));
      } catch (e) {
        grunt.fail.fatal('data could not be parsed from ' + options.data + '.');
      }
    } else if (typeof options.data === 'object') {
      templateData.data = options.data;
    } else {
      grunt.fail.fatal('data format not recognized.');
    }
  };

  /**
   * Updates the post collection with each post's destination
   * @param {Array} postCollection Collection of parsed posts with the content and metadata properties
   */
  lib.setPostDests = function (postCollection) {
    postCollection.forEach(function (post) {
      post.dest = lib.getPostDest(post);

      // Remove the source path from the post as it is only used for error logging in getPostDest
      delete post.sourcePath;
    });

  };

  /**
   * Returns the post destination based on the url property and postData
   * @param  {Object} post
   * @return {String}
   */
  lib.getPostDest = function (post) {
    if (typeof _this.data.dest === 'undefined') {
      grunt.fail.fatal('Please specify the dest property in your config.');
    }
    var dest = _this.data.dest + '/' + _this.data.url + '.html';

    var formatPostUrl = options.formatPostUrl || function (urlSegment) {
      return urlSegment.replace(/[^\w\s\-]/gi, '').replace(/\s{2,}/gi, ' ').replace(/\s/gi, '-').toLowerCase();
    };

    _this.data.url.split('/')

      .filter(function (urlSegment) {
        return urlSegment.indexOf(':') !== -1;
      })

      .map(function (urlSegment) {
        return urlSegment.slice(urlSegment.indexOf(':') + 1);
      })

      // Replace dynamic url segments
      .forEach(function (urlSegment) {

        // Make sure the post has the dynamic segment as a metadata property
        if (urlSegment in post) {
          dest = dest.replace(':' + urlSegment, formatPostUrl(post[urlSegment]));
        } else {
          grunt.fail.fatal('required ' + urlSegment + ' attribute not found in the following post\'s metadata: ' + post.sourcePath + '.');
        }
      });

    return dest;
  };

  /**
   * Updates the post collection with each post's url
   * @param {[Array]} postCollection Collection of parsed posts with the content and metadata properties
   */
  lib.setPostUrls = function (postCollection) {
    postCollection.forEach(function (post) {

      // Slice the destination folder from the beginning of the url
      post.url = post.dest.slice((_this.data.dest + '/').length);
    });
  };

  /**
   * Sorts the posts
   * @param {Array} postCollection Collection of parsed posts
   */
  lib.sortPosts = function (postCollection) {

    // Defaults to sorting posts by descending date
    var sortFunction = options.sortFunction ||
      function (a, b) {
        return b.date - a.date;
      };

    postCollection.sort(sortFunction);
  };

  /**
   * Generates posts based on the templateData
   * @param  {Object} templateData Data to be passed to templates for rendering
   */
  lib.generatePosts = function (templateData) {

    // Determine the template engine based on the file's extention name
    templateEngine = templateEngines[path.extname(_this.data.layout).slice(1)];

    var layoutString = fs.readFileSync(_this.data.layout, 'utf8');
    var fn = templateEngine.compile(layoutString, { pretty: true, filename: _this.data.layout });

    templateData.posts.forEach(function (post) {

      // Pass the post data to the template via a post object
      templateData.post = post;

      grunt.file.write(post.dest, fn(templateData));
      grunt.log.ok('Created '.green + 'post'.blue + ' at: ' + post.dest);
    });

    // Remove the post object from the templateData now that each post has been generated
    delete templateData.post;

    // Remove the dest property from the posts now that they are generated
    templateData.posts.forEach(function (post) {
      delete post.dest;
    });
  };

  /**
   * Generates pages using the posts' data
   * @param  {Object} templateData Data to be passed to templates for rendering
   */
  lib.generatePages = function (templateData) {

    // Ignore the listPage(s) when generating pages if pagination is enabled
    if (options.pagination) {
      var listPages = [null];
      if (Array.isArray(options.pagination)) {
        listPages = options.pagination.map(function (pagination) {
          return pagination.listPage;
        });
      } else {
        listPages = [options.pagination.listPage];
      }
    }

    grunt.file.recurse(options.pageSrc, function (abspath, rootdir) {

      // Don't include dotfiles
      if (path.basename(abspath).indexOf('.') === 0) {
        return false;
      }

      // Don't generate the paginated list page(s)
      if (!listPages || listPages && listPages.indexOf(abspath) === -1) {

        // If the template engine is specified, don't render templates with other filetypes
        if (!options.templateEngine || (options.templateEngine && path.extname(abspath) === '.' + options.templateEngine)) {
          var layoutString = fs.readFileSync(abspath, 'utf8');
          var fn = templateEngine.compile(layoutString, { pretty: true, filename: abspath });
          var dest = _this.data.dest + '/' +
                     abspath.slice(rootdir.length + 1).replace(path.extname(abspath), '.html');
          templateData.currentPage = path.basename(abspath, path.extname(abspath));
          grunt.file.write(dest, fn(templateData));
          grunt.log.ok('Created '.green + 'page'.magenta + ' at: ' + dest);
        }
      }
    });
  };

  /**
   * Default function to get post groups for each paginated list page
   * @param  {Array} postCollection
   * @return {Array}                Array of post arrays to be displayed on each paginated page
   */
  lib.getPostGroups = function (postCollection, pagination) {
    var postsPerPage = pagination.postsPerPage;
    var postGroups = [];
    var postGroup;
    var i = 0;

    while ((postGroup = postCollection.slice(i * postsPerPage, (i + 1) * postsPerPage)).length) {
      postGroups.push({
        posts: postGroup,
        id: i
      });
      i++;
    }
    return postGroups;
  };

  /**
   * Returns the set of paginated pages to be generated
   * @param  {Array}  postCollection
   * @param  {Object} pagination     Configuration object for pagination
   * @return {Array}                 Array of pages with the collection of posts and destination path
   */
  lib.getPaginatedPages = function (postCollection, pagination) {
    var postGroupGetter = pagination.getPostGroups ||
                          lib.getPostGroups;

    return postGroupGetter(postCollection, pagination).map(function (postGroup) {
      return {
        posts: postGroup.posts,
        id: postGroup.id,
        dest: lib.getListPageDest(postGroup.id, pagination)
      };
    });
  };

  /**
   * Creates paginated pages with a specified number of posts per page
   * @param  {Object} templateData Data to be passed to templates for rendering
   * @param  {Object} pagination   Configuration object for pagination
   */
  lib.paginate = function (templateData, pagination) {
    var listPage = pagination.listPage;
    var pages = lib.getPaginatedPages(templateData.posts, pagination);
    var layoutString = fs.readFileSync(listPage, 'utf8');
    var fn = templateEngine.compile(layoutString, { pretty: true, filename: listPage });

    var pageData = pages.map(function (page) {
      return {
        id: page.id,
        url: path.dirname(page.dest).slice(_this.data.dest.length) + '/'
      };
    });

    pages.forEach(function (page, pageNumber) {
      grunt.file.write(page.dest, fn({
        currentIndex: pageNumber,
        pages: pageData,
        posts: page.posts,
        data: templateData.data || {}
      }));
      grunt.log.ok('Created '.green + 'paginated'.rainbow + ' page'.magenta + ' at: ' + page.dest);
    });
  };

  /**
   * Gets a list page's destination to be written
   * @param  {Number} pageId     Identifier of current page to be written
   * @param  {Object} pagination Configuration object for pagination
   * @return {String}            Destination of list page
   */
  lib.getListPageDest = function (pageId, pagination) {
    var dest = _this.data.dest + '/';
    var listPage = pagination.listPage;
    var paginationURL = pagination.url || 'page/:id/index.html';

    // If the pageSrc option is used generate list pages relative to pageSrc
    // Otherwise, generate list pages in the root of 'dest'
    if (options.pageSrc) {
      if (listPage.indexOf(options.pageSrc) !== -1) {
        dest += listPage.slice(options.pageSrc.length + 1);
      } else {
        grunt.fail.fatal('the listPage must be within the pageSrc directory.');
      }
    }

    if (pageId === 0) {
      if (options.pageSrc) {
        dest = dest.replace(path.extname(listPage), '.html');
      } else {
        dest += 'index.html';
      }
    } else {
      if (paginationURL.indexOf(':id') === -1) {
        grunt.fail.fatal('The pagination url property must include an \':id\' variable which is replaced by the page\'s identifier.');
      }
      if (!options.pageSrc) {
        dest += paginationURL.replace(':id', pageId);
      } else {
        dest = dest.replace(path.basename(listPage), paginationURL.replace(':id', pageId));
      }
    }
    return dest;
  };

  // Return the library methods so that they can be tested
  return lib;
};
