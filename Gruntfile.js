/**
 * Created by toluogunremi on 3/12/15.
 */
var path = require('path');

module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        copy: {
            lib: {
                files: [
                    {
                        expand: true, cwd: 'node_modules/jquery/dist',
                        src: ['jquery.js', 'jquery.min.js', 'jquery.min.map'], dest: 'public/lib/'
                    },
                    {
                        expand: true, cwd: 'node_modules/bootstrap/dist',
                        src: ['css/**', 'fonts/**'], dest: 'public/lib/'
                    },
                    {
                        expand: true, cwd: 'node_modules/angular/',
                        src: ['angular.js', 'angular.min.js', 'angular.min.js.map', 'angular-csp.css'], dest: 'public/lib/'
                    },
                    {
                        expand: true, cwd: 'node_modules/angular-route/',
                        src: ['angular-route.js', 'angular-route.min.js', 'angular-route.min.js.map'], dest: 'public/lib/'
                    },
                    {
                        expand: true, cwd: 'node_modules/angular-sanitize/',
                        src: ['angular-sanitize.js', 'angular-sanitize.min.js', 'angular-sanitize.min.js.map'], dest: 'public/lib/'
                    },
                    {
                        expand: true, cwd: 'node_modules/angular-bootstrap/dist',
                        src: ['ui-bootstrap-tpls.js', 'ui-bootstrap-tpls.min.js'], dest: 'public/lib/'
                    },
                    {
                        expand: true, cwd: 'node_modules/angular-file-upload/',
                        src: ['angular-file-upload.js', 'angular-file-upload.min.js', 'angular-file-upload.js.map'], dest: 'public/lib/'
                    },
                    {
                        expand: true, cwd: 'node_modules/html5shiv/dist/',
                        src: ['html5shiv.min.js'], dest: 'public/lib/'
                    },
                    {
                        expand: true, cwd: 'node_modules/respond.js/dest/',
                        src: ['respond.min.js'], dest: 'public/lib/'
                    },
                    {
                        expand: true, cwd: 'node_modules/moment/min/',
                        src: ['moment.min.js', 'locales.min.js'], dest: 'public/lib/'
                    }
                ]
            }
        },
        concurrent: {
            dev: {
                tasks: ['nodemon'],
                options: {
                    logConcurrentOutput: true
                }
            }
        },
        nodemon: {
            dev: {
                script: 'app.js',
                options: {
                    ignore: [
                        'node_modules/**',
                        'public/**'
                    ],
                    ext: 'js'
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-nodemon');

    grunt.registerTask('build', ['copy:lib', 'concurrent']);
};
