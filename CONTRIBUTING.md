# Project Philosophy

grunt-pages is meant to be a low level utility to create html pages with extensible configuration. The goal is to provide an API so that tools like [Cabin](https://github.com/colinwren/Cabin) can be built on top of it to generate static sites. As such, the goal is to expose as much data as possible without including helpers for particular libraries or use cases.

# Tests

We use the [mocha](http://visionmedia.github.io/mocha/) test framework and [should](https://github.com/visionmedia/should.js/) assertion library to test grunt-pages. To run the test suite, enter the following command:

```bash
grunt test
```

There are integration tests located in [this](https://github.com/ChrisWren/grunt-pages/blob/master/test/integrationTests.js) file which verify that the html files were created as expected, and unit tests in [this](https://github.com/ChrisWren/grunt-pages/blob/master/test/unitTests.js) file which verify the logic implemented in library methods.

The goal is to test any new features in the integration test file and test any changes to library method logic in the unit test file.

## Performance

To see how fast grunt-pages is running, add the `--bench` flag. This will log the time it took to run the task after it is completed. The goal is to make grunt-pages run as fast as possible by using caching for both template rendering and post parsing and also optimizing the logic.