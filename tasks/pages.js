/*
 * grunt-pages
 * https://github.com/CabinJS/grunt-pages
 *
 * Copyright (c) 2013 Chris Wren & contributors
 * Licensed under the MIT license.
 */

'use strict';
var fs   = require('fs');
var path = require('path');
var url  = require('url');

require('colors');
var jsYAML     = require('js-yaml');
var _          = require('lodash');
var marked     = require('marked');
var pygmentize = require('pygmentize-bundled');
var RSS        = require('rss');

var templateEngines = {
  ejs:  require('ejs'),
  jade: require('jade')
};

// Define lib object to attach library methods to
var lib = {};

/**
 * Export module as a grunt plugin
 * @param  {Object} grunt Grunt object to register tasks and use for utilities
 */
module.exports = function (grunt) {

  // Allow for test objects to be used during unit testing
  var _this   = grunt.testContext || {};
  var options = grunt.testOptions || {};

  // Create a reference to the template engine that is available to all lib methods
  var templateEngine;

  // Save start time to monitor task run time
  var start = new Date().getTime();

  grunt.registerMultiTask('pages', 'Creates pages from markdown and templates.', function () {
    var done = this.async();

    // Create a reference to the the context object and task options so that they are available to all lib methods
    _this = this;
    options = this.options();

    // Get the content and metadata of unmodified posts so that they don't have to be parsed
    // if they haven't been modified
    var unmodifiedPosts = [];
    var cacheFile = path.normalize(__dirname + '/../.' + this.target + '-post-cache.json');
    if (fs.existsSync(cacheFile)) {
      unmodifiedPosts = lib.getUnmodifiedPosts(JSON.parse(fs.readFileSync(cacheFile)).posts);
      var unmodifiedPostPaths = unmodifiedPosts.map(function (post) {
        return post.sourcePath;
      });
    }

    // Don't include draft posts or dotfiles when counting the number of posts
    var numPosts = grunt.file.expand({
      filter: 'isFile',
      cwd: this.data.src
    }, [
      '**',
      '!_**',
      '!.**'
    ]).length;

    var parsedPosts    = unmodifiedPosts.length;
    var postCollection = unmodifiedPosts;

    // If there are no posts to parse, immediately render the posts and pages
    if (parsedPosts === numPosts) {
      lib.renderPostsAndPages(postCollection, cacheFile, done);
      return;
    }

    grunt.file.recurse(this.data.src, function (postpath) {

      // Don't parse unmodified posts
      if (unmodifiedPostPaths && unmodifiedPostPaths.indexOf(postpath) !== -1) {
        return;
      }

      // Don't include draft posts or dotfiles
      if (path.basename(postpath).indexOf('_') === 0 ||
          path.basename(postpath).indexOf('.') === 0) {
        return;
      }

      var post = lib.parsePostData(postpath);

      // Save source path for caching as well as error logging in getPostDest
      post.sourcePath = postpath;

      // Save the modification time of the post to allow for future caching
      post.lastModified = fs.statSync(post.sourcePath).mtime;

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

      // Parse post using [marked](https://github.com/chjj/marked)
      marked(post.markdown, function (err, content) {
        if (err) throw err;

        // Replace markdown source with content property
        post.content = content;
        delete post.markdown;

        postCollection.push(post);

        // Once all the source posts are parsed, we can generate the html posts
        if (++parsedPosts === numPosts) {
          lib.renderPostsAndPages(postCollection, cacheFile, done);
        }
      });
    });
  });

  /**
   * Parses the metadata and markdown from a post
   * @param  {String} postPath Absolute path of the post to be parsed
   * @return {Object} Object
   */
  lib.parsePostData = function (postPath) {
    var fileString = fs.readFileSync(postPath, 'utf8');
    var postData   = {};
    try {

      // Parse JSON metadata
      if (fileString.indexOf('{') === 0) {
        postData = eval('(' + fileString.substr(0, fileString.indexOf('\n}') + 2) + ')');
        postData.date = new Date(postData.date);
        postData.markdown = fileString.slice(fileString.indexOf('\n}') + 2);

      // Parse YAML metadata
      } else if (fileString.indexOf('----') === 0) {
        var sections = fileString.split('----');
        postData = jsYAML.load(sections[1]);

        // Extract the content by removing the metadata section
        postData.markdown = sections.slice(2).join('----');
      } else {
        grunt.fail.fatal('the metadata for the following post is formatted incorrectly: ' + postPath.red);
      }
      return postData;
    } catch (e) {
      grunt.fail.fatal('the metadata for the following post is formatted incorrectly: ' + postPath.red);
    }
  };

  /**
   * Returns an array of unmodified posts by checking the last modified date of each post in the cache
   * @param  {Array} posts Collection of posts
   * @return {Array}       An array of posts which have not been modified and do not need to be parsed
   */
  lib.getUnmodifiedPosts = function (posts) {
    return posts.filter(function (post) {

      // If the post has been moved or deleted, we can't cache it
      if (!fs.existsSync(post.sourcePath)) {
        return false;
      }

      // Check if the post was last modified when the cached version was last modifie
      if (('' + fs.statSync(post.sourcePath).mtime) === ('' + new Date(post.lastModified))) {

        // We have to restore the Date object since it is lost during JSON serialization
        post.date = new Date(post.date);
        return true;
      }
    });
  };

  /**
   * Updates the template data with the data from an Object or JSON file
   * @param {Object} templateData Data to be passed to templates for rendering
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
   * Renders posts and pages once all posts have been parsed
   * @param  {Array}    postCollection Collection of parsed posts with the content and metadata properties
   * @param  {String}   cacheFile      Pathname of file to write post data to for future caching of unmodified posts
   * @param  {Function} done           Callback to call once grunt-pages is done
   */
  lib.renderPostsAndPages = function (postCollection, cacheFile, done) {
    var templateData = { posts: postCollection };

    if (options.data) {
      lib.setData(templateData);
    }

    lib.setPostUrls(postCollection);
    postCollection.forEach( function (post) {
      post.dest = lib.getDestFromUrl(post.url);
    });
    lib.sortPosts(postCollection);

    var cachedPosts = _.cloneDeep(templateData);

    templateData.posts.forEach(function (post) {

      // Remove the lastModified attribute as it only used for caching
      delete post.lastModified;

      // Remove the source path from the post as it is only used for caching and error logging in getPostDest
      delete post.sourcePath;
    });

    var postStart = new Date().getTime();
    lib.generatePosts(templateData);

    if (grunt.option('bench')) {
      console.log('\nPosts'.blue + ' took ' + (new Date().getTime() - postStart) / 1000 + ' seconds.\n');
    }

    var pageStart = new Date().getTime();
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

    if (grunt.option('bench')) {
      console.log('\nPages'.magenta + ' took ' + (new Date().getTime() - pageStart) / 1000 + ' seconds.\n');
    }

    if (options.rss) {
      lib.generateRSS(postCollection);
    }

    fs.writeFileSync(cacheFile, JSON.stringify(cachedPosts));

    if (grunt.option('bench')) {
      console.log('Task'.yellow + ' took ' + (new Date().getTime() - start) / 1000 + ' seconds.');
    }
    done();
  };

  /**
   * Updates the post collection with each post's destination
   * @param {Array} postCollection Collection of parsed posts with the content and metadata properties
   */
  lib.setPostUrls = function (postCollection) {
    postCollection.forEach(function (post) {
      post.url = lib.getPostUrl(post);
    });
  };

  /**
   * Returns the post url based on the url property and postData
   * @param  {Object} post Post object containing all metadata properties of the post
   * @return {String}
   */
  lib.getPostUrl = function (post) {
    if (typeof _this.data.dest === 'undefined') {
      grunt.fail.fatal('Please specify the dest property in your config.');
    }

    var url = _this.data.url;

    var formatPostUrl = options.formatPostUrl || function (urlSegment) {
      return urlSegment
        .toLowerCase() // change everything to lowercase
        .replace(/^\s+|\s+$/g, '') // trim leading and trailing spaces
        .replace(/[_|\s|\.]+/g, '-') // change all spaces, periods and underscores to a hyphen
        .replace(/[^a-z\u0400-\u04FF0-9-]+/g, '') // remove all non-cyrillic, non-numeric characters except the hyphen
        .replace(/[-]+/g, '-') // replace multiple instances of the hyphen with a single instance
        .replace(/^-+|-+$/g, ''); // trim leading and trailing hyphens
    };

    // Extract dynamic url segments and replace them with post metadata
    _this.data.url.split('/')

      .filter(function (urlSegment) {
        return urlSegment.indexOf(':') !== -1;
      })

      .map(function (urlSegment) {
        return urlSegment.slice(urlSegment.indexOf(':') + 1);
      })

      // Replace dynamic url segments
      .forEach(function (urlSegment) {
        if (urlSegment.indexOf('.html') !== -1) {
          urlSegment = urlSegment.slice(0, - '.html'.length);
        }
        // Make sure the post has the dynamic segment as a metadata property
        if (urlSegment in post) {
          url = url.replace(':' + urlSegment, formatPostUrl(post[urlSegment]));
        } else {
          grunt.fail.fatal('required ' + urlSegment + ' attribute not found in the following post\'s metadata: ' + post.sourcePath + '.');
        }
      });

    return url;
  };

  /**
   * Gets a post's or page's destionation based on its url
   * @param {String} url Url to determine the destination from
   */
  lib.getDestFromUrl = function (url) {
    var dest = _this.data.dest + '/' + url;
    if (dest.indexOf('.html') === -1) {
      if (dest.lastIndexOf('/') === dest.length - 1) {
        dest += 'index.html';
      } else {
        dest += '.html';
      }
    }

    return dest;
  };

  /**
   * Sorts the posts
   * @param {Array} postCollection Collection of parsed posts with the content and metadata properties
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

    grunt.file.recurse(options.pageSrc, function (abspath, rootdir) {
      if (lib.shouldRenderPage(abspath)) {
        var layoutString = fs.readFileSync(abspath, 'utf8');
        var fn           = templateEngine.compile(layoutString, { pretty: true, filename: abspath });
        var dest         = path.normalize(_this.data.dest + '/' +
                           path.normalize(abspath).slice(path.normalize(rootdir).length + 1).replace(path.extname(abspath), '.html'));

        templateData.currentPage = path.basename(abspath, path.extname(abspath));
        grunt.file.write(dest, fn(templateData));
        grunt.log.ok('Created '.green + 'page'.magenta + ' at: ' + dest);
      }
    });
  };

  /**
   * Determines if a page inside of the options.pageSrc folder should be rendered
   * @param  {String} abspath Absolute path of the page in question
   * @return {Boolean}
   */
  lib.shouldRenderPage = function (abspath) {
    var listPages = [];

    // Ignore the pagination listPage(s) when generating pages if pagination is enabled
    if (options.pagination) {

      if (Array.isArray(options.pagination)) {
        listPages = options.pagination.map(function (pagination) {
          return pagination.listPage;
        });
      } else {
        listPages = [options.pagination.listPage];
      }
    }

    // Don't generate the paginated list page(s)
    if (listPages && listPages.indexOf(abspath) !== -1) {
      return false;
    }

    // Don't include dotfiles
    if (path.basename(abspath).indexOf('.') === 0) {
      return false;
    }

    // If the template engine is specified, don't render templates with other filetypes
    if (options.templateEngine && path.extname(abspath) !== '.' + options.templateEngine) {
      return false;
    }

    return true;
  };

  /**
   * Default function to get post groups for each paginated list page by grouping a specified number of posts per page
   * @param  {Array} postCollection Collection of parsed posts with the content and metadata properties
   * @return {Array}                Array of post arrays to be displayed on each paginated page
   */
  lib.getPostGroups = function (postCollection, pagination) {
    var postsPerPage = pagination.postsPerPage;
    var postGroups   = [];
    var i            = 0;
    var postGroup;

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
   * @param  {Array}  postCollection Collection of parsed posts with the content and metadata properties
   * @param  {Object} pagination     Configuration object for pagination
   * @return {Array}                 Array of pages with the collection of posts and destination path
   */
  lib.getPaginatedPages = function (postCollection, pagination) {
    var postGroupGetter = pagination.getPostGroups ||
                          lib.getPostGroups;

    return postGroupGetter(postCollection, pagination).map(function (postGroup) {
      return {
        posts: postGroup.posts,
        id:    postGroup.id,
        url:   lib.getListPageUrl(postGroup.id, pagination)
      };
    });
  };

  /**
   * Creates paginated pages with a specified number of posts per page
   * @param  {Object} templateData Data to be passed to templates for rendering
   * @param  {Object} pagination   Configuration object for pagination
   */
  lib.paginate = function (templateData, pagination) {
    var listPage     = pagination.listPage;
    var pages        = lib.getPaginatedPages(templateData.posts, pagination);
    var layoutString = fs.readFileSync(listPage, 'utf8');
    var fn           = templateEngine.compile(layoutString, { pretty: true, filename: listPage });

    pages.forEach(function (page, currentIndex) {
      grunt.file.write(lib.getDestFromUrl(page.url), fn({
        currentIndex: currentIndex,
        pages: _.map(pages, function (page) {
          return _.omit(page, 'posts');
        }),
        posts: page.posts,
        data:  templateData.data || {}
      }));
      grunt.log.ok('Created '.green + 'paginated'.rainbow + ' page'.magenta + ' at: ' + lib.getDestFromUrl(page.url));
    });
  };

  /**
   * Writes RSS feed XML based on the collection of posts
   * @param  {Array} postCollection Collection of parsed posts with the content and metadata properties
   */
  lib.generateRSS = function (postCollection) {
    if (!options.rss.url) {
      grunt.fail.fatal('options.rss.url is required');
    }

    if (!options.rss.title) {
      grunt.fail.fatal('options.rss.title is required');
    }

    if (!options.rss.author) {
      grunt.fail.fatal('options.rss.author is required');
    }

    var fileName = options.rss.path || 'feed.xml';
    var dest     = path.join(_this.data.dest, fileName);

    // Create a new feed
    var feed = new RSS({
      title:          options.rss.title,
      description:    options.rss.description,
      feed_url:       url.resolve(options.rss.url, fileName),
      site_url:       options.rss.url,
      image_url:      options.rss.image_url,
      docs:           options.rss.docs,
      author:         options.rss.author,
      managingEditor: options.rss.managingEditor || options.rss.author,
      webMaster:      options.rss.webMaster || options.rss.author,
      copyright:      options.rss.copyRight || new Date().getFullYear() + ' ' + options.rss.author,
      language:       options.rss.language || 'en',
      categories:     options.rss.categories,
      pubDate:        options.rss.pubDate || new Date().toString(),
      ttl:            options.rss.ttl || '60'
    });

    // Add each post
    postCollection.forEach(function (post) {
      feed.item({
        title:       post.title,
        description: post.content,
        url:         url.resolve(options.rss.url, post.url),
        categories:  post.tags,
        date:        post.date
      });
    });

    grunt.file.write(dest, feed.xml());

    grunt.log.ok('Created '.green + 'RSS feed'.yellow + ' at ' + dest);
  };

  /**
   * Gets a list page's destination to be written
   * @param  {Number} pageId     Identifier of current page to be written
   * @param  {Object} pagination Configuration object for pagination
   * @return {String}
   */
  lib.getListPageUrl = function (pageId, pagination) {
    var listPage  = pagination.listPage;
    var url       = '';
    var urlFormat = pagination.url || 'page/:id/';

    // If the pageSrc option is used, generate list pages relative to options.pageSrc
    // Otherwise, generate list pages relative to the root of the destination folder
    if (options.pageSrc) {
      if (listPage.indexOf(options.pageSrc + '/') !== -1) {
        url += listPage.slice(options.pageSrc.length + 1);
      } else {
        grunt.fail.fatal('the pagination.listPage must be within the options.pageSrc directory.');
      }
    }

    // The root list page is either the template file's location relative to options.pageSrc
    // or a blank url for the site root
    if (pageId === 0) {
      if (options.pageSrc) {
        url = url.replace(path.extname(listPage), '.html');
      } else {
        url = '';
      }

    // Every other list page's url is generated using the urlFormat property and is either generated
    // relative to the folder that contains the listPage or relative to the root of the site
    } else {
      if (urlFormat.indexOf(':id') === -1) {
        grunt.fail.fatal('The pagination.url property must include an \':id\' variable which is replaced by the page\'s identifier.');
      }
      if (options.pageSrc) {
        url = url.replace(path.basename(listPage), urlFormat.replace(':id', pageId));
      } else {
        url += urlFormat.replace(':id', pageId);
      }
    }

    // Removed trailing index.html from urls
    if (url.lastIndexOf('index.html') === url.length - 'index.html'.length) {
      url = url.slice(0, - 'index.html'.length);
    }

    return url;
  };

  // Return the library methods so that they can be tested
  return lib;
};
