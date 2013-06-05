# grunt-pages
[![NPM version](https://badge.fury.io/js/grunt-pages.png)](http://badge.fury.io/js/grunt-pages)  
[![Dependency Status](https://gemnasium.com/ChrisWren/grunt-pages.png)](https://gemnasium.com/ChrisWren/grunt-pages)   
[![Travis Status](https://travis-ci.org/ChrisWren/grunt-pages.png?branch=master)](https://travis-ci.org/ChrisWren/grunt-pages)
> Grunt task to create pages using markdown and templates

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
Here is a sample config to create a blog using `grunt-pages`:
```js
pages: {
  options: {
    pageSrc: 'src/pages'
  },
  posts: {
    src: 'src/posts',
    dest: 'dev',
    layout: 'src/layouts/post.ejs',
    url: 'blog/posts/:title' 
  }
}
```
### Formatting posts
Posts are written in markdown and include a metadata section at the top to provide information about the post. There are two accepted metadata formats, YAML and a JavaScript object. Here is a YAML example:
```yaml
----
title:   The Versace Sofa Thesis Vol. I
date:    2010-10-4
author:  Pusha T
----
```
The YAML data is parsed into a JavaScript object and passed to the layout template to be rendered.

Here is a JavaScript object example:
```js
{
  title: "Art Ballin': Explorations in New-Weird-American Expressionism",
  date: "2013-2-22",
  author: "Highroller, Jody"
}
```
The only property that is not interpreted literally is the `date`. It is used as a `dateString` when constructing a [Date object](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Date) in JavaScript, and must be in a [parseable format](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Date/parse). For both YAML and JavaScript object metadata, the JavaScript `Date` object is available in the layout.

*Note: posts have GitHub flavoured markdown syntax highlighting using [pygments](http://pygments.org/).*

### Required properties
#### src
Type: `String`

The directory where the source posts are located.

#### dest
Type: `String`

The directory where pages are generated. 

#### layout
Type: `String`

The [jade](https://github.com/visionmedia/jade) or [ejs](https://github.com/visionmedia/ejs) layout template for each post. The post metadata will be stored in a `post` object to be rendered in the layout template. [Here](https://github.com/ChrisWren/grunt-pages/blob/master/test/fixtures/ejs/layouts/post.ejs) is an example post layout template.

#### url
Type: `String`

The url format of each post. The string takes variables as parameters using the `:variable` syntax. Variable(s) specified in the url are required in each post's metadata.

### Options

#### pageSrc
Type: `String`

The folder where the source pages of your website are located. These pages have access to the posts' content and metadata in a `posts` array. All of the files in this folder are generated in the `dest` folder maintaining the same relative path from `pageSrc`.

#### pagination
Type: `Object`

An object containing config for pagination.

##### pagination.postsPerPage
Type: `Number`

The number of posts each list page will contain.

##### pagination.listPage
Type: `String`

The location of the layout which is used for each list page. The layout has access to the following variables:

###### pageNumber
Type: `Number`

The page number of the current page.
###### numPages
Type: `Number`

The total number of list pages.
###### posts
Type: `Array` of `Object`s

An array of post objects which contain the content and metadata for each post.

# Changelog

**0.0.0** - Initial release

