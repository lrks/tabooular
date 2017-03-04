'use strict';

function escapeText(str, flg) {
	if (!flg) return str;
	var table = {
		'&': '&amp;',
		"'": '&#x27;',
		'`': '&#x60;',
		'"': '&quot;',
		'<': '&lt;',
		'>': '&gt;',
	};

	Object.keys(table).forEach(function (key) {
		str = str.replace(new RegExp(key, 'g'), table[key]);
	});

	return str;
}

function makeLine(row, neck, tag, escape_flg) {
	var line = '';

	row.forEach(function(col, i) {
		if (col.type === 'ref') return;

		var data = col.data;
		if (Array.isArray(data)) {
			var left = escapeText(data[0], escape_flg);
			var right = escapeText(data[2], escape_flg);
			data = (data[1] === '^') ? '<sub>'+left+'</sub> <sup>'+right+'</sup>' : '<sup>'+left+'</sup> <sub>'+right+'</sub>';
		} else {
			data = escapeText(data, escape_flg);
		}

		var attr = '';
		if (col.rs !== 1) attr += ' rowspan="' + col.rs + '"';
		if (col.cs !== 1) attr += ' colspan="' + col.cs + '"';

		var align_flg = (col.align === 'd') ? neck[i].align : col.align;
		var align = (align_flg === 'r') ? 'right' : (align_flg === 'l') ? 'left' : 'center';
		var cls = [ 'align-' + align ];
		attr += ' align="' + align + '"';

		if (neck[i].bleft) cls.push('border-left');
		if (neck[i+col.cs-1].bright) cls.push('border-right');
		if (cls.length !== 0) attr += ' class="' + cls.join(' ') + '"';
		line += '<' + tag + attr + '>' + data + '</' + tag + '>';
	});
	
	return line;
}

module.exports.toHTML = function(json, escape_flg) {
	var result = '<table class="tabooular"><thead>\n';
	json.head.forEach(function(row) { result += '<tr>' + makeLine(row, json.neck, 'th', escape_flg) + '</tr>\n'; });
	result += '</thead><tbody>\n';

	json.body.forEach(function(rows, i) {
		rows.forEach(function(row, j) {
			var tag = ((j === (rows.length - 1)) && (i !== (json.body.length - 1))) ? '<tr class="border-bottom">' : '<tr>';
			result += tag + makeLine(row, json.neck, 'td', escape_flg) + '</tr>\n'
		});
	});

	result += '</tbody></table>';
	return result;
}