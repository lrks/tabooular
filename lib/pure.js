'use strict';

function escapeText(str, flg) {
	if (!flg) return str;
	return str.replace(/"/g, '\\"');
}

function makeLine(row, neck, escape_flg) {
	var lines = [];

	row.forEach(function(col, i) {
		if (col.type === 'ref') return;

		var data = col.data;
		if (Array.isArray(data)) {
			var left = escapeText(data[0], escape_flg);
			var right = escapeText(data[2], escape_flg);
			data = `${left} ${escapeText(data[1], escape_flg)} ${right}`;
		} else {
			data = escapeText(data, escape_flg);
		}

		lines.push(`"${data}"`);
	});

	return lines.join(', ');
}

module.exports.toPure = function(json, escape_flg) {
	var result = '';
	json.head.forEach(function(row) { result += makeLine(row, json.neck, escape_flg) + '\n'; });
	json.body.forEach(function(rows, i) {
		rows.forEach(function(row, j) {
			result += makeLine(row, json.neck, escape_flg) + '\n';
		});
	});

	return result;
}
