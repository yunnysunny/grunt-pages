module.exports = function (grunt) {
  // load all grunt tasks
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  var globalConfig = {};

  grunt.initConfig({
    globalConfig: globalConfig,
    pages: {
      posts: {
        src: 'test/fixtures/integration/input/posts/',
        dest: 'dev',
        layout: 'test/fixtures/integration/input/ejs/layouts/post.ejs',
        url: 'blog/posts/:title/',
        options: {
          formatPostUrl: function (urlSegment) {
            return urlSegment.replace(/[^a-zA-Z0-9]/g, '_');
          },
          pageSrc: 'test/fixtures/integration/input/ejs/pages',
          templateEngine: 'ejs',
          data: 'test/fixtures/integration/input/data/data.json'
        }
      },
      rss_default: {
        src: 'test/fixtures/integration/input/posts/',
        dest: 'dev',
        layout: 'test/fixtures/integration/input/ejs/layouts/post.ejs',
        url: 'blog/posts/:title/',
        options: {
          rss: {
            author: 'The Author',
            title: 'Blog of Blogs',
            description: 'The Description',
            url: 'http://the.url.com',
            pubDate: new Date(1000) // Must pass date for output to match
          },
          pageSrc: 'test/fixtures/integration/input/ejs/pages',
          templateEngine: 'ejs',
          data: 'test/fixtures/integration/input/data/data.json'
        }
      },
      rss_custom: {
        src: 'test/fixtures/integration/input/posts/',
        dest: 'dev',
        layout: 'test/fixtures/integration/input/ejs/layouts/post.ejs',
        url: 'blog/posts/:title/',
        options: {
          rss: {
            path: 'rss/rss.xml',
            author: 'The Author',
            title: 'Blog of Blogs',
            description: 'The Description',
            url: 'http://the.url.com',
            image_url: 'http://the.url.com/image.jpg',
            docs: 'The Docs',
            managingEditor: 'The Managing Editor',
            webMaster: 'The Web Master',
            copyRight: '2044 Industries Inc.',
            language: 'sp',
            categories: ['stuff', 'things', 'items', 'widgets'],
            ttl: '40',
            pubDate: new Date(1000) // Must pass date for output to match
          },
          pageSrc: 'test/fixtures/integration/input/ejs/pages',
          templateEngine: 'ejs',
          data: 'test/fixtures/integration/input/data/data.json'
        }
      },
      paginated: {
        src: 'test/fixtures/integration/input/posts/',
        dest: 'dev',
        layout: 'test/fixtures/integration/input/jade/layouts/post.jade',
        url: 'blog/posts/:title/',
        options: {
          sortFunction: function (a, b) {
            return a.date - b.date;
          },
          data: {
            test: 1
          },
          pagination: [{
            postsPerPage: 1,
            listPage: 'test/fixtures/integration/input/jade/pages/blog/index.jade',
            url: 'list/:id/index.html'
          }, {
            listPage: 'test/fixtures/integration/input/jade/pages/blog/index.jade',
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
          }]
        }
      }
    },
    clean: {
      build: ['dev'],
      cache: ['.*post-cache.json']
    },
    copy: {
      styles: {
        files: [{
          expand: true,
          flatten: true,
          src: ['test/fixtures/integration/input/styles/*'],
          dest: 'dev/styles/'
        }]
      }
    },
    simplemocha: {
      options: {
        globals: ['should'],
        timeout: 10000,
        ignoreLeaks: false,
        ui: 'bdd',
        reporter: 'spec'
      },
      all: {
        src: ['test/*.js']
      },
      spec: {
        src: ['test/<%= globalConfig.file %>.js']
      }
    },
    connect: {
      server: {
        options: {
          port: 9001,
          base: 'dev',
          keepalive: true
        }
      }
    },
    concurrent: {
      tasks: ['connect:server', 'watch'],
      options: {
        logConcurrentOutput: true
      }
    },
    watch: {
      options: {
        livereload: true
      },
      src: {
        files: ['tasks/*.js', 'test/fixtures/integration/input/**'],
        tasks: ['jshint', 'build']
      },
      tests: {
        files: ['test/*.js']
      }
    },
    jshint: {
      options: {
        bitwise: true,
        indent: 2,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        nonew: true,
        quotmark: 'single',
        sub: true,
        undef: true,
        unused: true,
        boss: true,
        trailing: true,
        eqnull: true,
        node: true,
        expr: true,
        evil: true,
        globals: {
          describe: true,
          it: true,
          before: true
        }
      },
      files: {
        src:  ['*.js', 'test/*.js', 'tasks/*.js']
      }
    }
  });

  grunt.loadTasks('./tasks');
  grunt.registerTask('build', ['clean:build', 'copy', 'pages:paginated']);
  grunt.registerTask('test', ['clean', 'jshint', 'simplemocha:all']);
  grunt.registerTask('default', ['concurrent']);

  grunt.registerTask('spec', 'Runs a task on a specified file', function (fileName) {
    globalConfig.file = fileName;
    grunt.task.run('simplemocha:spec');
  });
};
