'use strict';
var PEG = require('./lib/table');

var json = require('./lib/json');
var latex = require('./lib/latex');
var html = require('./lib/html');

module.exports = function() {
	this.data = null;
	this.esc = false;
	this.setEscape = function(flg) { this.esc = flg; }

	this.fromJSON = function(obj) { this.data = json.cleanse(obj); }
	this.fromPlain = function(str) { this.data = json.cleanse(json.fromTree(PEG.parse(str))); }

	this.to = function(func) { return (this.data === null) ? null : func(this.data, this.esc); }
	this.toJSON = function() { return this.data; }
	this.toLaTeX = function() { return this.to(latex.toLaTeX); }
	this.toHTML = function() { return this.to(html.toHTML); }
};
