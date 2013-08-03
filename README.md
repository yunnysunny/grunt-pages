# grunt-pages
> Grunt task to create pages using markdown and templates

[![NPM version](https://badge.fury.io/js/grunt-pages.png)](http://badge.fury.io/js/grunt-pages)  
[![Dependency Status](https://gemnasium.com/ChrisWren/grunt-pages.png)](https://gemnasium.com/ChrisWren/grunt-pages)   
[![Travis Status](https://travis-ci.org/ChrisWren/grunt-pages.png?branch=master)](https://travis-ci.org/ChrisWren/grunt-pages)

## Getting Started
If you haven't used grunt before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a gruntfile as well as install and use grunt plugins. Once you're familiar with that process, install this plugin with this command:
```shell
npm install grunt-pages --save-dev
```

Then add this line to your project's `Gruntfile.js` gruntfile:

```javascript
grunt.loadNpmTasks('grunt-pages');
```

## Documentation
### Sample config
Here is a sample config to create a blog using grunt-pages:
```js
pages: {
  options: {
    pageSrc: 'src/pages'
  },
  posts: {
    src: 'src/posts',
    dest: 'dev',
    layout: 'src/layouts/post.jade',
    url: 'blog/posts/:title' 
  }
}
```

### Authoring posts

#### Post Format
Posts are written in markdown and include a metadata section at the top to provide information about the post. There are two accepted metadata formats, YAML and a JavaScript object. Here is a YAML example:
```yaml
----
title:   The Versace Sofa Thesis Vol. I
date:    2010-10-4
author:  Pusha T
----
```
The YAML data is parsed into a JavaScript object and passed to the post's template to be rendered.

Here is a JavaScript object example:
```js
{
  title: "Art Ballin': Explorations in New-Weird-American Expressionism",
  date: "2013-2-22",
  author: "Highroller, Jody"
}
```
The only property that is not interpreted literally is the `date`. It is used as a `dateString` when constructing a [Date object](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Date) in JavaScript, and must be in a [parseable format](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Date/parse). For both YAML and JavaScript object metadata, the JavaScript `Date` object is available in the layout.

#### Syntax Highlighting
For adding code to your posts, grunt-pages has [GitHub flavoured markdown](https://help.github.com/articles/github-flavored-markdown) syntax highlighting using [pygments](http://pygments.org/).

#### Draft Posts
To make a post a draft, simply prefix its filename with a `_`. These posts will not be rendered or available in list pages.

### Required properties
#### src
Type: `String`

The directory where the source posts are located.

#### dest
Type: `String`

The directory where pages are generated. 

#### layout
Type: `String`

The [jade](https://github.com/visionmedia/jade) or [ejs](https://github.com/visionmedia/ejs) layout template used for each post. The post metadata will be stored in a `post` object to be rendered in the layout template. [Here](https://github.com/ChrisWren/grunt-pages/blob/master/test/fixtures/jade/layouts/post.jade) is an example post layout template.

#### url
Type: `String`

The url of each post. The url string takes variables as parameters using the `:variable` syntax. Variable(s) specified in the url are required in each post's metadata.

### Options

#### pageSrc
Type: `String`

The folder where the ejs or jade source pages of your website are located. These pages have access to each post's `content` and metadata properties via a `posts` array. Additionally, pages have access to their own filename(without extension) via the `currentPage` variable. All of the files in this folder are generated in the `dest` folder maintaining the same relative path from `pageSrc`.

#### data
Type: `Object || String`

A JavaScript object or the location of a JSON file which is passed as data to templates. This option is primarily used to specify config that is shared across all pages. It is available in page and post templates via the `data` object.

#### sortFunction
Type: `Function`

Default: Sort by `date` descending

```js
function (a, b) {
  return b.date - a.date;
}
```

A compare function used by [Array.sort](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort) to sort posts. 

#### formatPostUrl
Type: `Function`

Default:
```js
function (url) {
  return url.replace(/[^\w\s\-]/gi, '').replace(/\s{2,}/gi, ' ').replace(/\s/gi, '-').toLowerCase();
}
```
A function that takes a `url` as a parameter and returns a formatted url string. This is primarily used to remove special characters and replace whitespace.

#### rss
Type: `Object`

An object containing config for RSS feed generation. 

All [options accepted by dylang/node-rss](https://github.com/dylang/node-rss#feed-options) are supported, with notable options listed below.

Here is a sample config to create a blog with an RSS feed using grunt-pages:
```js
pages: {
  options: {
    pageSrc: 'src/pages',
    rss: {
      author: 'Chris Wren',
      title: 'Chris Wren\'s Blog',
      description: 'A blog about software, music, and commerce.',
      url: 'http://chrisawren.com'
    }
  },
  posts: {
    src: 'src/posts',
    dest: 'dev',
    layout: 'src/layouts/post.jade',
    url: 'blog/posts/:title'
  }
}
```

##### rss.url
Type: `String`

The URL of your site.

##### rss.author
Type: `String`

The feed owner. Also used as `managingEditor` and `webMaster` if those options are not specified.

##### rss.title
Type: `String`

The title of the feed.

##### rss.description
Type: `String`

Optional. Short description of the feed.

##### rss.path
Type: `String`

Optional. The path of the file to store the RSS XML in. This is specific to grunt-pages and is not part of dylang/node-rss.

#### pagination
Type: `Object || Array`

Object or an array of objects containing config for pagination. This option generates paginated list pages which each contain a specified group of posts.

### Config using the default pagination scheme

```js
pages: {
  options: {
    pagination: {
      postsPerPage: 3,
      listPage: 'src/layouts/listPage.jade'
    }
  },
  posts: {
    src: 'src/posts',
    dest: 'dev',
    layout: 'src/layouts/post.jade',
    url: 'posts/:title'
  }
}
```

This config will generate paginated list pages by grouping the specified number of posts per page and using the default url scheme specified in the [pagination.url](#paginationurl) parameter.

##### pagination.postsPerPage
Type: `Number`

The number of posts each list page will contain.

##### pagination.listPage
Type: `String`

The location of the layout template which is used for each list page. [Here](https://github.com/ChrisWren/grunt-pages/blob/master/test/fixtures/jade/pages/blog/index.jade) is a sample `listPage` template. This template has access to the following variables:

###### posts
Type: `Array` of `Object`s

An array of post objects assigned to this page which each contain the `content` and metadata properties of the post.

###### pages
Type: `Array` of `Object`s

An array of page objects which each contain a `url` and `id` property.

###### currentIndex
Type: `Number`

A reference to the index of the page currently being rendered. This can be used to display the current page differently than the rest of the pages in a list, or to display links to the surrounding pages based on their position relative to the `currentIndex`.

##### pagination.url
Type: `String` Default: `pages/:id/index.html`

The location of the generated list pages relative to the `pagination.listPage`. You can override this property to have a custom url scheme for list pages. You **must** have a `:id` variable in your url scheme which will be replaced by the page's id.

### Config using a custom pagination scheme

To paginate in a custom manor, you can use the following parameter:

##### pagination.getPostGroups
Type: `Function` 

Default: `Group by postsPerPage`

```js
function (postCollection, pagination) {
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
}
```

This function returns an array of post groups to be rendered as list pages. It takes the `posts` array and `pagination` config object as parameters and is expected to return an array of postGroup objects which each contain the `id` of the group(to be used in the url) and the array of `posts` in the following format:

```js
[{
  id: 'javascript',
  posts: [{
    title: 'ES6',
    tags: ['javascript'],
    content: '...'
  }, {
    title: 'Backbone.js',
    tags: ['javascript'],
    content: '...'
  }]
}, {
  id: 'css',
  posts: [{
    title: 'Style and Sass',
    tags: ['css'],
    content: '...'
  }]
}];
```

Here is a sample pagination config which paginates using the `tags` property of each post:

```js
pages: {
  options: {
    pagination: {
      listPage: 'src/layouts/tagListPage.jade',
      getPostGroups: function (posts) {
        var postGroups = {};

        posts.forEach(function (post) {
          post.tags.forEach(function (tag) {
            tag = tag.toLowerCase();
            if (postGroups[tag]) {
              postGroups[tag].posts.push(post);
            } else {
              postGroups[tag] = {
                posts: [post]
              };
            }
          });
        });

        return grunt.util._.map(postGroups, function (postGroup, id) {
          return {
            id: id,
            posts: postGroup.posts
          };
        });
      }
    }
  },
  posts: {
    src: 'src/posts',
    dest: 'dev',
    layout: 'src/layouts/post.jade',
    url: 'posts/:title'
  }
}
```

#### templateEngine
Type: `String`

The file extension of the template engine to be used. This option filters template files in the `pageSrc` folder when developing a grunt-pages configuration for multiple template engines.

# Changelog

**0.3.3** - Added lodash as a hard dependency.

**0.3.2** - Added post caching for unmodified posts to speed up task.

**0.3.1** - Added [rss option](https://github.com/ChrisWren/grunt-pages#rss) to generates feeds.

**0.3.0** - Altered pagination API to allow for custom pagination schemes.

**0.2.5** - Fixed metadata parsing bug, added `formatPostUrl` option & added `pagination.url` option.

**0.2.4** - Added `sortFunction` option & allowed for `data` option to take an object as a parameter.

**0.2.3** - Ignored dotfiles, added error reporting for incorrect data JSON files, and added new header anchor link format.

**0.2.2** - Used forked version of marked to enable header anchor links.

**0.2.1** - Added support for `_` prefixed draft posts and pages now receive their filename as a `currentPage` variable.

**0.2.0** - Fixed `templateEngine` bug, changed `pagination` and `data` api.

**0.1.0** - Added `data` option, added `templateEngine` option, added `pagination` option, and changed post data format to be a `post` object rather than global variables for each post property.

**0.0.0** - Initial release.

