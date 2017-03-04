'use strict';
var gulp = require('gulp');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var peg = require('gulp-peg');

gulp.task('build', function() {
	gulp.src([
		'./lib/table.pegjs'
	]).pipe(peg()).pipe(gulp.dest('./lib'));
	
	browserify({
		'entries': ['./docs/demo.js']
	}).bundle().pipe(source('packed.js')).pipe(gulp.dest('./docs'));
});

gulp.task('default', ['build']);