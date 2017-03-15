'use strict';

function cleanseSub(data, cols, default_align) {
	var rows = data.length;
	default_align = default_align || 'd';

	for (var y=0; y<rows; y++) {
		for (var i=data[y].length; i<cols; i++) data[y].push({type:'cell'});
		for (var i=data[y].length; i>cols; i--) data[y].pop();
		for (var x=0; x<cols; x++) {
			if (data[y][x].type === 'ref' && data[y][x].position) {
				data[y][x] = { 'type':'ref', 'position':data[y][x].position };
			} else {
				data[y][x] = {
					'type': 'cell',
					'data': data[y][x].data || '',
					'align': data[y][x].align || default_align,
					'cs': data[y][x].cs || 1,
					'rs': data[y][x].rs || 1
				};
			}
		}
	}

	return data;
}

function cleanse(tree) {
	var ret = { 'neck': tree.neck };
	var cols = tree.neck.length;
	ret.cols = cols;
	ret.head = cleanseSub(tree.head, cols, 'c');
	ret.body = tree.body.map(function(v){ return cleanseSub(v, cols); });

	return ret;
}




function getAlign(justifier) {
	var c1 = justifier[0].charAt(0);
	var c2 = justifier[1].charAt(0);
	if (c1 === '>' && c2 === '>') return 'r';
	if (c1 === '<' && c2 === '<') return 'l';
	return 'c';
}

function concat(dst, src) {
	function koubashi_coon(d, s) {
		return (/[\x20-\x7e]$/.test(d) && /^[\x20-\x7e]/.test(s)) ? d + ' ' + s : d + s;
	}

	var dflg = Array.isArray(dst);
	var sflg = Array.isArray(src);

	if (!dflg && !sflg) return koubashi_coon(dst, src);
	if (!dlfg && slfg) return [ koubashi_coon(dst, src[0]), src[1], src[2] ];
	if (dflg && !sflg) return [ dst[0], dst[1], koubashi_coon(dst[2], src) ];
	return '';
}

function expand(data, cols) {
	var rows = data.length;

	for (var y=0; y<rows; y++) {
		for (var i=data[y].length; i<cols; i++) data[y].push({type:'padding'});
		for (var x=0; x<cols; x++) {
			switch(data[y][x].type) {
			case 'normal':
				if (y === 0) break;
				switch(data[y-1][x].type) {
				case 'linebreak':
					var base = y-1;
					while (--base >= 0) if (data[base][x].type !== 'linebreak') break;
					base++;

					data[base][x].type = 'normal';
					data[base][x].rs = y - base + 1;
					for (var yy=base+1; yy<=y; yy++) {
						data[yy][x].type = 'ref';
						data[yy][x].position = [0, yy-base];
						data[base][x].data = concat(data[base][x].data, data[yy][x].data);
					}
					break;
				case 'startjoin':
				case 'betweenjoin':
					data[y][x].type = 'betweenjoin';
					data[y][x].cs = data[y-1][x].cs;
					for (var i=1; i<data[y][x].cs; i++) data[y].splice(x+i, 0, {type:'ref'});
					break;
				}
				break;
			case 'linebreak':
				if (y === 0) break;
				if (!(data[y-1][x].type === 'startjoin' || data[y-1][x].type === 'betweenjoin')) break;
				data[y][x].type = 'betweenjoin';
				data[y][x].cs = data[y-1][x].cs;
				for (var i=1; i<data[y][x].cs; i++) data[y].splice(x+i, 0, {type:'ref'});
				break;
			case 'join':
				data[y][x].type = 'normal';
				data[y][x].align = getAlign(data[y][x].justifier);
				data[y][x].cs = data[y][x].justifier[0].length;
				if ((x + data[y][x].cs) > cols) data[y][x].cs = (cols - x);
				for (var i=1; i<data[y][x].cs; i++) data[y].splice(x+i, 0, {type:'ref', position:[i, 0]});
				break;
			case 'startjoin':
				data[y][x].cs = data[y][x].justifier.length;
				if ((x + data[y][x].cs) > cols) data[y][x].cs = (cols - x);
				for (var i=1; i<data[y][x].cs; i++) data[y].splice(x+i, 0, {type:'ref', position:[i, 0]});
				break;
			case 'endjoin':
				var base = y;
				while (true) if (data[--base][x].type === 'startjoin') break;

				data[base][x].type = 'normal';
				data[base][x].rs = y - base + 1;
				data[base][x].align = getAlign([data[base][x].justifier, data[y][x].justifier]);
				for (var i=1; i<data[base][x].cs; i++) data[y].splice(x+i, 0, {type:'ref'});

				for (var yy=base+1; yy<=y; yy++) {
					data[base][x].data = concat(data[base][x].data, data[yy][x].data);
					for (var xx=x; xx<(x+data[base][x].cs); xx++) {
						data[yy][xx].type = 'ref';
						data[yy][xx].position = [xx-x, yy-base];
					}
				}
				break;
			}
		}
	}

	return data;
}

function fromTree(tree) {
	var cols = (tree.neck.length + 1) / 2;
	tree.head = expand(tree.head, cols);
	tree.body = tree.body.map(function(v){ return expand(v, cols); });

	var neck = [];
	for (var i=0; i<cols; i++) {
		var idx = i * 2;
		var lidx = idx - 1;
		var ridx = idx + 1;

		var left = false, right = false;
		if (lidx >= 0) left = (tree.neck[lidx] === '|');
		if (ridx < tree.neck.length) right = (tree.neck[ridx] === '|');
		var align = (tree.neck[idx] === '<') ? 'l' : (tree.neck[idx] === '>') ? 'r' : 'c';

		neck.push({'align':align, 'bleft':left, 'bright':right});
	}

	tree.neck = neck;
	return cleanse(tree);
}


module.exports.cleanse = cleanse;
module.exports.fromTree = fromTree;