module.exports = function (grunt) {
  // load all grunt tasks
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({
    blog: {
      options: {
        pageSrc: 'test/fixtures/jade/pages',
        devFolder: 'dev',
        distFolder: 'dist'
      },
      posts: {
        layout: 'test/fixtures/jade/layouts/post.jade',
        src: 'test/fixtures/posts/',
        url: 'blog/posts/:title'
      }
    },
    clean: ['dev'],
    copy: {
      styles: {
        files: [{
          expand: true,
          flatten: true,
          src: ['test/fixtures/styles/*'],
          dest: 'dev/styles/'
        }]
      }
    },
    simplemocha: {
      options: {
        globals: ['should'],
        timeout: 3000,
        ignoreLeaks: false,
        ui: 'bdd',
        reporter: 'nyan'
      },
      all: {
        src: ['test/*.js']
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
        files: ['test/fixtures/**'],
        tasks: ['build']
      }
    },
    jshint: {
      options: {
        curly: true,
        camelcase: true,
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
  grunt.registerTask('build', ['clean', 'copy', 'blog']);
  grunt.registerTask('test', ['jshint', 'simplemocha']);
};
