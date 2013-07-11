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

var _ = require('lodash');
var jsYAML = require('js-yaml');
var marked = require('marked');
var pygmentize = require('pygmentize-bundled');
require('colors');

var templateEngines = {
  jade: require('jade'),
  ejs: require('ejs')
};

module.exports = function (grunt) {
  var _this;
  var options;
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
      var post = parsePostData(postpath);

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
            setData(templateData);
          }

          setPostDests(postCollection);
          setPostUrls(postCollection);
          sortPosts(postCollection);

          generatePosts(templateData);

          if (options.pageSrc) {
            generatePages(templateData);
          }

          if (options.pagination) {
            paginate(postCollection);
          }

          done();
        }
      });
    });
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
        grunt.fail.fatal('the metadata for the following post is formatted incorrectly: ' + abspath.red);
      }
      return postData;
    } catch (e) {
      grunt.fail.fatal('the metadata for the following post is formatted incorrectly: ' + abspath.red);
    }
  }

  /**
   * Updates the template data with the data from an Object or JSON file
   * @param {object} templateData
   */
  function setData (templateData) {
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
  }

  /**
   * Updates the post collection with each post's destination
   * @param {Array} postCollection Collection of parsed posts
   */
  function setPostDests (postCollection) {
    postCollection.forEach(function (post) {
      post.dest = getPostDest(post);

      // Remove the source path from the post as it is only used for error logging in getPostDest
      delete post.sourcePath;
    });

  }

  /**
   * Returns the post destination based on the url property and postData
   * @param  {Object} post
   * @return {String}
   */
  function getPostDest (post) {
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
  }

  /**
   * Updates the post collection with each post's url
   * @param {[Array]} postCollection Array of posts
   */
  function setPostUrls (postCollection) {
    postCollection.forEach(function (post) {

      // Slice the destination folder from the beginning of the url
      post.url = post.dest.slice((_this.data.dest + '/').length);
    });
  }

  /**
   * Sorts the posts
   * @param {Array} postCollection Collection of parsed posts
   */
  function sortPosts (postCollection) {

    // Defaults to sorting posts by descending date
    var sortFunction = options.sortFunction ||
      function (a, b) {
        return b.date - a.date;
      };

    postCollection.sort(sortFunction);
  }

  /**
   * Generates posts based on the templateData
   * @param  {Object} templateData
   */
  function generatePosts (templateData) {
    templateData.posts.forEach(function (post) {

      // Pass the post data to the template via a post object
      templateData.post = post;

      // Determine the template engine based on the file's extention name
      templateEngine = templateEngines[path.extname(_this.data.layout).slice(1)];

      var layoutString = fs.readFileSync(_this.data.layout, 'utf8');
      var fn = templateEngine.compile(layoutString, { pretty: true, filename: _this.data.layout });
      grunt.file.write(post.dest, fn(_.omit(templateData, 'posts')));
      grunt.log.ok('Created '.green + 'post'.blue + ' at: ' + post.dest);
    });

    // Remove the post object from the templateData now that each post has been generated
    delete templateData.post;

    // Remove the dest property from the posts now that they are generated
    templateData.posts.forEach(function (post) {
      delete post.dest;
    });
  }

  /**
   * Generates pages using the posts' data
   * @param  {Object} templateData
   */
  function generatePages (templateData) {

    // Ignore the listPage if pagination is enabled
    if (options.pagination) {
      var listPage = options.pagination.listPage;
    }

    grunt.file.recurse(options.pageSrc, function (abspath, rootdir) {

      // Don't include dotfiles
      if (path.basename(abspath).indexOf('.') === 0) {
        return;
      }

      // Don't generate the paginated list page
      if (abspath !== listPage) {
        if (!options.templateEngine || (options.templateEngine && path.extname(abspath) === '.' + options.templateEngine)) {
          var layoutString = fs.readFileSync(abspath, 'utf8');
          var fn = templateEngine.compile(layoutString, { pretty: true, filename: abspath });
          var dest = _this.data.dest + '/' +
                     abspath.slice(rootdir.length + 1).replace(path.extname(abspath), '.html');
          grunt.log.ok('Created '.green + 'page'.magenta + ' at: ' + dest);
          templateData.currentPage = path.basename(abspath, path.extname(abspath));
          grunt.file.write(dest, fn(templateData));
        }
      }
    });
  }

  /**
   * Creates paginated pages with a specified number of posts per page
   * @param  {Array} postCollection
   */
  function paginate (postCollection) {
    var postGroups = [];
    var postGroup;

    var postsPerPage = options.pagination.postsPerPage;
    var listPage = options.pagination.listPage;

    var i = 0;
    while ((postGroup = postCollection.slice( i * postsPerPage, (i + 1) * postsPerPage)).length) {
      postGroups.push(postGroup);
      i++;
    }

    var pageDests = [];

    postGroups.forEach(function (postGroup, pageNumber) {
      pageDests.push(getListPageDest(listPage, pageNumber));
    });

    var pageUrls = pageDests.map(function (dest) {
      return { url: path.dirname(dest).slice(_this.data.dest.length) + '/' };
    });

    var layoutString = fs.readFileSync(listPage, 'utf8');
    var fn = templateEngine.compile(layoutString, { pretty: true, filename: listPage });

    postGroups.forEach(function (postGroup, pageNumber) {
      pageUrls[pageNumber].currentPage = true;
      grunt.file.write(pageDests[pageNumber], fn({
        pages: pageUrls,
        posts: postGroup
      }));
      delete pageUrls[pageNumber].currentPage;
      grunt.log.ok('Created '.green + 'paginated'.rainbow + ' page'.magenta + ' at: ' + pageDests[pageNumber]);
    });
  }

  /**
   * Gets a list page's destination to be written
   * @param  {String} listPage   Source list page template layout file
   * @param  {Number} pageNumber Index of current page to be writtern
   * @return {String}            Destination of current page
   */
  function getListPageDest (listPage, pageNumber) {
    var dest = _this.data.dest + '/' ;

    var paginationURL = options.pagination.url || 'page/:index/index.html';

    // If the pageSrc option is used generate list pages relative to pageSrc
    // Otherwise, generate list pages in the root of 'dest'
    if (options.pageSrc) {
      if (listPage.indexOf(options.pageSrc) !== -1) {
        dest += listPage.slice(options.pageSrc.length + 1);
      } else {
        grunt.fail.fatal('the listPage must be within the pageSrc directory');
      }
    }

    if (pageNumber === 0) {
      if (!options.pageSrc) {
        dest += 'index.html';
      } else {
        dest = dest.replace(path.extname(listPage), '.html');
      }
    } else {
      if (paginationURL.indexOf(':index') === -1) {
        grunt.fail.fatal('The pagination url property must include a \':index\' variable which is replaced by the pages index');
      }
      if (!options.pageSrc) {
        dest += paginationURL.replace(':index', pageNumber);
      } else {
        dest = dest.replace(path.basename(listPage), paginationURL.replace(':index', pageNumber));
      }
    }
    return dest;
  }
};
