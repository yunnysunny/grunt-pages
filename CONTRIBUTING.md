# Project Philosophy

grunt-pages is meant to be a low level utility to create html pages with extensible configuration. The goal is to provide an API so that tools like [Cabin](https://github.com/colinwren/Cabin) can be built on top of it to generate static sites. As such, the goal is to expose as much data as possible without including helpers for particular libraries or use cases.

# Tests

We use the [mocha](http://visionmedia.github.io/mocha/) test framework and [should](https://github.com/visionmedia/should.js/) assertion library to test grunt-pages. To run the test suite, enter the following command:

```bash
grunt test
```

There are integration tests located in [this](https://github.com/ChrisWren/grunt-pages/blob/master/test/fileCreationTest.js) file which verify that the html files were created as expected, and unit tests in [this](https://github.com/ChrisWren/grunt-pages/blob/master/test/libtest.js) file which verify the logic implemented in library methods.

The goal is to add any new features into the integration test file and add any changes to library method logic to the unit test file.