'use strict';

function escapeText(str, flg) {
	if (!flg) return str;

	// Base: https://github.com/kmuto/review/blob/87add3463669f9f3d07c8de7096410f86d7d1d37/lib/review/latexutils.rb
	var table = {
		'\\\\': '\\textbackslash ',
		'{': '\\{',
		'}': '\\}',
		'#': '\\#',
		'\\$': '\\textdollar{}',
		'%': '\\%',
		'&': '\\&',
		'_': '\\textunderscore{}',
		'\\^': '\\textasciicircum{}',
		'~': '\\textasciitilde{}',
		'\\|': '\\textbar{}',
		'<': '\\textless{}',
		'>': '\\textgreater{}',
		'\\-': '{-}',
	};

	var tmp = str;
	Object.keys(table).forEach(function (key) {
		str = str.replace(new RegExp(key, 'g'), table[key]);
	});

	return str;
}

function makeLine(row, neck, escape_flg) {
	var line = [];

	row.forEach(function(col, i) {
		if (col.type === 'ref') {
			if (col.position[1] > 0) line.push('');
			return;
		}

		var data = col.data;
		if (Array.isArray(data)) {
			var left = (data[0] === '') ? '\\ ' : escapeText(data[0], escape_flg);
			var right = (data[2] === '') ? '\\ ' : escapeText(data[2], escape_flg);
			var params = [ data[1] === '^' ? 'dir=NW' : 'dir=NE' ];
			if (left === right === '\\ ') params.push('height=\\line');
			data = '\\diagbox[' + params.join(',') + ']{' + left + '}{' + right + '}';
		} else {
			data = escapeText(data, escape_flg);
		}

		if (col.rs !== 1) data = '\\multirow{' + col.rs + '}{*}{' + data + '}';
		if (col.cs !== 1 || col.align !== 'd') {
			var right = neck[i+col.cs-1].bright ? '|' : '';
			data = '\\multicolumn{' + col.cs + '}{' + col.align + right + '}{' + data + '}';
		}

		line.push(data);
	});

	return line.join('&');
}

module.exports.toLaTeX = function(json, escape_flg) {
	var result = '\\begin{tabular}{';
	json.neck.forEach(function(val, idx) { result += (val.bleft ? '|' : '') + val.align.toLowerCase(); });
	result += '}';
	if (json.head.length > 0) result += '\\toprule\n';
	json.head.forEach(function(row) { result += makeLine(row, json.neck, escape_flg) + '\\\\\n'; });

	json.body.forEach(function(rows) {
		result += '\\midrule\n';
		rows.forEach(function(row) { result += makeLine(row, json.neck, escape_flg) + '\\\\\n'; });
	});
	result += '\\bottomrule\n';

	result += '\\end{tabular}\n';
	return result;
}
