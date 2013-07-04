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

The url of each post. The string takes variables as parameters using the `:variable` syntax. Variable(s) specified in the url are required in each post's metadata.

### Options

#### pageSrc
Type: `String`

The folder where the ejs or jade source pages of your website are located. These pages have access to the posts' content and metadata in a `posts` array. Additionally, pages have access to their own filename(without extension) via the `currentPage` variable. All of the files in this folder are generated in the `dest` folder maintaining the same relative path from `pageSrc`.

#### data
Type: `Object || String`

A JavaScript object or the location of a JSON file which is passed as data to templates. This option is primarily used for data to be shared across all pages. It is available in page and post templates via the `data` object.

#### sortFunction
Type: `Function` Default: Sort by `date` descending

A compare function used by [Array.sort](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort) to sort posts. 

#### pagination
Type: `Object`

An object containing config for pagination. This option generates paginated list pages which each containing a specified number of posts. These paginated list pages are generated in the `dest` folder relative to the pagination.listPage's location in the format `pagination.listPage`/pages/`pageNumber`/index.html.

Here is a sample config using pagination:

```js
pages: {
  options: {
    pagination: {
      listPage: 'src/layouts/listPage.jade',
      postsPerPage: 3
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

##### pagination.postsPerPage
Type: `Number`

The number of posts each list page will contain.

##### pagination.listPage
Type: `String`

The location of the layout template which is used for each list page. [Here](https://github.com/ChrisWren/grunt-pages/blob/master/test/fixtures/jade/pages/blog/index.jade) is a sample template that uses pagination. The template has access to the following variables:

###### pages
Type: `Array` of `Object`s

An array of page objects which each contain a `url` property. The page currently being rendered also has a `currentPage` boolean property.

###### posts
Type: `Array` of `Object`s

An array of post objects which contains the `content` and metadata properties for each post.

#### templateEngine
Type: `String`

The file extension of the page layouts' template engine. This is used to filter template files in the `pageSrc` folder when developing a [Cabin](http://colinwren.github.io/Cabin/) theme for multiple template engines.

# Changelog

**0.2.4** - Added sortFunction option & allowed for data option to take an object as a parameter.

**0.2.3** - Ignore dotfiles, error reporting for incorrect data JSON files, and new header anchor link format.

**0.2.2** - Used forked version of marked to enable header anchor links.

**0.2.1** - Added support for `_` prefixed draft posts and pages now receive their filename as a `currentPage` variable.

**0.2.0** - Fixed `templateEngine` bug, changed `pagination` and `data` api.

**0.1.0** - Added `data` option, added `templateEngine` option, added `pagination` option, and changed post data format to be a `post` object rather than global variables for each post property.

**0.0.0** - Initial release.

