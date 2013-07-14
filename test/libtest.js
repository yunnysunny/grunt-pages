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

    it('should log an error if the data is not a YAML or JavaScript Object', function () {
      lib.parsePostData(__dirname + '/fixtures/lib/post/badmetadata.md');
      failStub.lastCall.args[0].should.include('the metadata for the following post is formatted incorrectly:');
    });

    describe('when parsing JavaScript Object metadata', function () {

      it('should log an error if the data is not a valid JavaScript Object', function () {
        lib.parsePostData(__dirname + '/fixtures/lib/post/badobjectmetadata.md');
        failStub.lastCall.args[0].should.include('the metadata for the following post is formatted incorrectly:');
      });

      it('should return the post metadata and content if the metadata is a valid JavaScript Object', function () {
        lib.parsePostData(__dirname + '/fixtures/lib/post/goodobjectmetadata.md').title.should.eql('Good Post :)');
      });

    });

    describe('when parsing YAML metadata', function () {

      it('should log an error if the data is not valid YAML', function () {
        lib.parsePostData(__dirname + '/fixtures/lib/post/badyamlmetadata.md');
        failStub.lastCall.args[0].should.include('the metadata for the following post is formatted incorrectly:');
      });

      it('should return the post metadata and content if the metadata is valid YAML', function () {
        lib.parsePostData(__dirname + '/fixtures/lib/post/goodyamlmetadata.md').title.should.eql('test');
      });

    });

  });

  describe('setData', function () {

    var data = { test: 'testval' };

    it('should add the data property directly to the templateData object when data is an Object', function () {
      var templateData = {};
      lib = pages.call(_.extend(grunt, {
        testOptions: {
          data: 'test/fixtures/lib/data.json'
        }
      }), grunt);
      lib.setData(templateData);
      templateData.data.should.eql(data);
    });

    it('should read a JSON file specified by the data property directly to the templateData object when data is a String', function () {
      var templateData = {};

      lib = pages.call(_.extend(grunt, {
        testOptions: {
          data: data
        }
      }), grunt);
      lib.setData(templateData);
      templateData.data.should.eql(data);
    });

    it('should log an error if JSON file is invalid', function () {
      lib = pages.call(_.extend(grunt, {
        testOptions: {
          data: 'test/fixtures/lib/baddata.json'
        }
      }), grunt);
      lib.setData({});
      failStub.lastCall.args[0].should.include('data could not be parsed');
    });

    it('should log an error if the format isn\'t recognized', function () {
      lib = pages.call(_.extend(grunt, {
        testOptions: {
          data: 4
        }
      }), grunt);
      lib.setData({});
      failStub.lastCall.args[0].should.include('data format not recognized.');
    });

  });

});