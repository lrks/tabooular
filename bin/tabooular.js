#!/usr/bin/env node
'use strict';

var fs = require('fs');
var opts = require('opts');
var readline = require('readline');
var tabooular = require('../index.js');


/*------------------------------------*/
/*       Parse command-line arg       */
/*------------------------------------*/
var input_file = null;
var output_file = null;
var input_format = 'text';
var output_format = 'json';
var escape_flg = false;

// tabooular -if plain -of json -i plain.txt -o obj.json
// tabooular -if json -of latex -i obj.json -o table.text
// tabooular -if plain -of html -i plain.txt -o index.html
var options = [
	{ short       : 'v'
	, long        : 'version'
	, description : 'Show version and exit'
	, callback    : function () { console.log('v1.0'); process.exit(1); }
	},
	{ short       : 'i'
	, long        : 'input'
	, description : 'PATH of the input file'
	, value       : true
	, callback    : function (value) { input_file = value; }
	},
	{ short       : 'o'
	, long        : 'output'
	, description : 'PATH of the output file'
	, value       : true
	, callback    : function (value) { output_file = value; }
	},
	{ short       : 'if'
	, long        : 'input-format'
	, description : 'The format of the input file'
	, value       : true
	, callback    : function (value) { input_format = value; }
	},
	{ short       : 'of'
	, long        : 'output-format'
	, description : 'The format of the output file'
	, value       : true
	, callback    : function (value) { output_format = value; }
	},
	{ long        : 'escape'
	, description : 'The flag for escape the output'
	, value       : false
	, callback    : function () { escape_flg = true; }
	},
];

opts.parse(options, true);


/*------------------------------------*/
/*           Generate table           */
/*------------------------------------*/
function generate(input) {
	var generator = new tabooular();
	generator.setEscape(escape_flg);

	switch(input_format.toLowerCase()) {
	case 'plain':
		generator.fromPlain(input);
		break;
	case 'json':
		generator.fromJSON(JSON.parse(input));
		break;
	default:
		process.exit(1);
	}

	var result = null;
	switch (output_format.toLowerCase()) {
	case 'json':
		result = JSON.stringify(generator.toJSON(), null, 2);
		break;
	case 'latex':
		result = generator.toLaTeX();
		break;
	case 'html':
		result = generator.toHTML();
		break;
	case 'pure':
		result = generator.toPure();
		break;
	}
	if (result === null) process.exit(1);
	
	if (output_file == null) {
		process.stdout.write(result);
	} else {
		fs.writeFileSync(output_file, result);
	}
}

if (input_file === null) {
	var input = '';
	var rl = readline.createInterface(process.stdin, process.stdout);
	rl.on('line', function (line) { input += line + '\n'; });
	rl.on('close', function () {
		generate(input);
		process.exit(0);
	});
} else {
	generate(fs.readFileSync(input_file).toString());
	process.exit(0);
}