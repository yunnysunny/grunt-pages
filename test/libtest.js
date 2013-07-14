/* global before */
var pages = require('../tasks/pages.js');
var grunt = require('grunt');
var sinon = require('sinon');
var _ = require('lodash');
require('should');

var lib;
var failStub = sinon.stub(grunt.fail, 'fatal');

describe('grunt-pages library', function () {

  describe('parsePostData', function () {

    before(function () {
      lib = pages(grunt);
    });

    it('should log an error if the post metadata is not YAML or a JavaScript Object', function () {
      lib.parsePostData(__dirname + '/fixtures/lib/post/badmetadata.md');
      failStub.lastCall.args[0].should.include('the metadata for the following post is formatted incorrectly:');
    });

    describe('when parsing JavaScript Object metadata', function () {

      it('should log an error if the post metadata is not a valid JavaScript Object', function () {
        lib.parsePostData(__dirname + '/fixtures/lib/post/badobjectmetadata.md');
        failStub.lastCall.args[0].should.include('the metadata for the following post is formatted incorrectly:');
      });

      it('should return the post metadata and markdown if the metadata is a valid JavaScript Object', function () {
        lib.parsePostData(__dirname + '/fixtures/lib/post/goodobjectmetadata.md').title.should.eql('Good Post :)');
        lib.parsePostData(__dirname + '/fixtures/lib/post/goodobjectmetadata.md').markdown.should.eql('\n\n# Hello');
      });

    });

    describe('when parsing YAML metadata', function () {

      it('should log an error if the data is not valid YAML', function () {
        lib.parsePostData(__dirname + '/fixtures/lib/post/badyamlmetadata.md');
        failStub.lastCall.args[0].should.include('the metadata for the following post is formatted incorrectly:');
      });

      it('should return the post metadata and markdown if the metadata is valid YAML', function () {
        lib.parsePostData(__dirname + '/fixtures/lib/post/goodobjectmetadata.md').title.should.eql('Good Post :)');
        lib.parsePostData(__dirname + '/fixtures/lib/post/goodobjectmetadata.md').markdown.should.eql('\n\n# Hello');
      });

    });

  });

  describe('setData', function () {

    var data = { test: 'testval' };

    it('should add the options.data property directly to the templateData object when options.data is an Object', function () {
      var templateData = {};

      lib = pages.call(_.extend(grunt, {
        testOptions: {
          data: 'test/fixtures/lib/data.json'
        }
      }), grunt);
      lib.setData(templateData);
      templateData.data.should.eql(data);
    });

    it('should read a JSON file specified by the options.data property directly to the templateData object when options.data is a String', function () {
      var templateData = {};

      lib = pages.call(_.extend(grunt, {
        testOptions: {
          data: data
        }
      }), grunt);

      lib.setData(templateData);
      templateData.data.should.eql(data);
    });

    it('should log an error if the JSON file specified by the options.data String is invalid', function () {
      lib = pages.call(_.extend(grunt, {
        testOptions: {
          data: 'test/fixtures/lib/baddata.json'
        }
      }), grunt);

      lib.setData({});
      failStub.lastCall.args[0].should.include('data could not be parsed');
    });

    it('should log an error if the options.data format is not an Object or String', function () {
      lib = pages.call(_.extend(grunt, {
        testOptions: {
          data: 4
        }
      }), grunt);
      lib.setData({});
      failStub.lastCall.args[0].should.include('data format not recognized.');
    });

  });

  describe('getPostDest', function () {

    it('should log an error if the dest property isn\'t specified', function () {
      lib = pages.call(_.extend(grunt, {
        testContext: {
          data: {
            url: 'test'
          }
        }
      }), grunt);

      lib.getPostDest({});
      failStub.lastCall.args[0].should.include('Please specify the dest property in your config.');
    });

    it('should log an error if the post doesn\'t contain metadata specified as a :variable in its url', function () {
      lib = pages.call(_.extend(grunt, {
        testContext: {
          data: {
            dest: 'dest',
            url: 'posts/:title'
          }
        }
      }), grunt);

      lib.getPostDest({});
      failStub.lastCall.args[0].should.include('required title attribute not found');
    });

    it('should return the post destination after replacing the :variables in the url with its metadata', function () {
      lib = pages.call(_.extend(grunt, {
        testContext: {
          data: {
            url: 'posts/:title',
            dest: 'dest'
          }
        }
      }), grunt);

      lib.getPostDest({
        title: 'Cool Post'
      }).should.include('dest/posts/cool-post.html');
    });

  });

});