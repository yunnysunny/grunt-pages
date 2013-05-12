module.exports = function (grunt) {
// console.log(this);
  grunt.initConfig({
    blog: {
      options: {
        pageSrc: 'test/fixtures/pages',
        devFolder: 'dev',
        distFolder: 'dist'
      },
      posts: {
        layout: 'test/fixtures/layouts/post.jade',
        src: 'test/fixtures/posts',
        url: 'blog/posts/:title'
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
        files: ['src/**'],
        tasks: ['jsblog']
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
        globals:{
          module: true
        }
      },
      files: {
        src:  ['*.js', 'test/*.js', 'task/*.js']
      }
    }
  });

  grunt.loadTasks('./tasks');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-concurrent');
  grunt.loadNpmTasks('grunt-simple-mocha');
  grunt.registerTask('test', ['jshint', 'simplemocha']);
};
