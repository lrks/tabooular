(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
(function (global){
'use strict';
var jQuery = (typeof window !== "undefined" ? window['$'] : typeof global !== "undefined" ? global['$'] : null);
var tabooular = require('../index.js');

function to(generator, type, input) {
	switch(type) {
	case 'latex':
		return generator.toLaTeX() + '\n\n' + input.replace(/^(.*)$/mg, '% $&');
	case 'html':
	case 'live':
		return generator.toHTML() + '\n\n<!--\n' + input + '\n-->';
	case 'json':
		return JSON.stringify(generator.toJSON(), null, 2);
	}

	return null;
}

function handler() {
	var input = $("textarea").val();
	var escape_flg = $('#escapeField').is(':checked');

	var types = [ 'latex', 'html', 'live', 'json'];
	types.forEach(function(t) { $('#' + t).hide(); });

	try {
		var generator = new tabooular();
		generator.setEscape(escape_flg);
		generator.fromPlain(input);

		types.forEach(function(t) {
			if (!$('#' + t + 'Field').is(':checked')) return;

			var txt = '';
			try {
				txt = to(generator, t, input);
			} catch(e) {
				txt = e.message;
				console.log('HA', t, txt);
			} finally {
				if (t === 'live') {
					$('#live div').html(txt);
				} else {
					$('#' + t).find('code').text(txt);
				}
				$('#' + t).show();
			}
		});
	} catch(e) {
		console.log(e);
		var pre = (e.location !== undefined) ? ('Line: ' + e.location.start.line + ', Col: ' + e.location.start.column + ', ') : '';
		types.forEach(function(t) {
			if (t === 'live') {
				$('#live div').text(pre + e.message);
			} else {
				$('#' + t).find('code').text(pre + e.message);
			}

			if ($('#' + t + 'Field').is(':checked')) $('#' + t).show();
		});
	}
}

$(function() {
	$('textarea').on('change keydown keyup', handler);
	$('input:checkbox').on('change', handler);

	$('form a.button').on('click', function(e) {
		e.preventDefault();
		var href = $(this).prop('href');
		$.get(href, function(data) { $('textarea').val(data).change(); });
	});

	$.get($('form a.button:first').prop('href'), function(data) {
		$('textarea').val(data).change();
	});
});
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../index.js":2}],2:[function(require,module,exports){
'use strict';
const PEG = require('./lib/table');

const json = require('./lib/json');
const latex = require('./lib/latex');
const html = require('./lib/html');

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

},{"./lib/html":3,"./lib/json":4,"./lib/latex":5,"./lib/table":6}],3:[function(require,module,exports){
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

	result += '</tbody></table>\n';
	return result;
}

},{}],4:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
module.exports = (function() {
  "use strict";

  /*
   * Generated by PEG.js 0.9.0.
   *
   * http://pegjs.org/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function peg$SyntaxError(message, expected, found, location) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.location = location;
    this.name     = "SyntaxError";

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, peg$SyntaxError);
    }
  }

  peg$subclass(peg$SyntaxError, Error);

  function peg$parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},
        parser  = this,

        peg$FAILED = {},

        peg$startRuleFunctions = { start: peg$parsestart },
        peg$startRuleFunction  = peg$parsestart,

        peg$c0 = function(t) { return t; },
        peg$c1 = /^[\n\r\u2028\u2029]/,
        peg$c2 = { type: "class", value: "[\\n\\r\\u2028\\u2029]", description: "[\\n\\r\\u2028\\u2029]" },
        peg$c3 = "\t",
        peg$c4 = { type: "literal", value: "\t", description: "\"\\t\"" },
        peg$c5 = "\x0B",
        peg$c6 = { type: "literal", value: "\x0B", description: "\"\\x0B\"" },
        peg$c7 = "\f",
        peg$c8 = { type: "literal", value: "\f", description: "\"\\f\"" },
        peg$c9 = " ",
        peg$c10 = { type: "literal", value: " ", description: "\" \"" },
        peg$c11 = "\xA0",
        peg$c12 = { type: "literal", value: "\xA0", description: "\"\\xA0\"" },
        peg$c13 = "\uFEFF",
        peg$c14 = { type: "literal", value: "\uFEFF", description: "\"\\uFEFF\"" },
        peg$c15 = /^[ \xA0\u1680\u2000-\u200A\u202F\u205F\u3000]/,
        peg$c16 = { type: "class", value: "[\\u0020\\u00A0\\u1680\\u2000-\\u200A\\u202F\\u205F\\u3000]", description: "[\\u0020\\u00A0\\u1680\\u2000-\\u200A\\u202F\\u205F\\u3000]" },
        peg$c17 = { type: "any", description: "any character" },
        peg$c18 = /^[1-9]/,
        peg$c19 = { type: "class", value: "[1-9]", description: "[1-9]" },
        peg$c20 = /^[0-9]/,
        peg$c21 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c22 = ";",
        peg$c23 = { type: "literal", value: ";", description: "\";\"" },
        peg$c24 = "&",
        peg$c25 = { type: "literal", value: "&", description: "\"&\"" },
        peg$c26 = "|",
        peg$c27 = { type: "literal", value: "|", description: "\"|\"" },
        peg$c28 = "^",
        peg$c29 = { type: "literal", value: "^", description: "\"^\"" },
        peg$c30 = "_",
        peg$c31 = { type: "literal", value: "_", description: "\"_\"" },
        peg$c32 = function() { return "&"; },
        peg$c33 = "<",
        peg$c34 = { type: "literal", value: "<", description: "\"<\"" },
        peg$c35 = ">",
        peg$c36 = { type: "literal", value: ">", description: "\">\"" },
        peg$c37 = "\\",
        peg$c38 = { type: "literal", value: "\\", description: "\"\\\\\"" },
        peg$c39 = function(esc) { return esc; },
        peg$c40 = function(char) { return char; },
        peg$c41 = function(s) { return s.join('').trim(); },
        peg$c42 = function(j) { return j.join(''); },
        peg$c43 = function(s1, sep, s2) { return [s1, sep, s2]; },
        peg$c44 = function(s) { return {type:'normal', data:s} },
        peg$c45 = function(s) { return {type: 'linebreak', data:s} },
        peg$c46 = function(j1, s, j2) { return {type:'join', data:s, justifier:[j1, j2]} },
        peg$c47 = function(j, s) { return {type: 'startjoin', data:s, justifier:j} },
        peg$c48 = function(s, j) { return {type: 'endjoin', data:s, justifier:j} },
        peg$c49 = "=",
        peg$c50 = { type: "literal", value: "=", description: "\"=\"" },
        peg$c51 = function(s) { return (s.join('').replace(/=/g, '') + "=").charAt(0); },
        peg$c52 = function(head, neck, body) { return {head:head, neck:neck, body:body}; },
        peg$c53 = function(c1, cs) { return [c1].concat(cs.map(function(x){return x[1];})); },
        peg$c54 = function(cs) { return [{type:'normal',data:''}].concat(cs.map(function(x){return x[1];})); },
        peg$c55 = function(cs) { return cs.map(function(x){return x[0];}).concat({type:'normal',data:''}); },
        peg$c56 = function(cs) { return [{type:'normal',data:''}].concat(cs.map(function(x){return x[0];})).concat({type:'normal',data:''}); },
        peg$c57 = function(r) { return r; },
        peg$c58 = function(c1, cs) { return [c1].concat(Array.prototype.concat.apply([], cs)); },
        peg$c59 = function(b, bs) { return [b].concat(bs.map(function(v){return v[1];})); },
        peg$c60 = "---",
        peg$c61 = { type: "literal", value: "---", description: "\"---\"" },
        peg$c62 = "-",
        peg$c63 = { type: "literal", value: "-", description: "\"-\"" },
        peg$c64 = function() { return null; },

        peg$currPos          = 0,
        peg$savedPos         = 0,
        peg$posDetailsCache  = [{ line: 1, column: 1, seenCR: false }],
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$savedPos, peg$currPos);
    }

    function location() {
      return peg$computeLocation(peg$savedPos, peg$currPos);
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        input.substring(peg$savedPos, peg$currPos),
        peg$computeLocation(peg$savedPos, peg$currPos)
      );
    }

    function error(message) {
      throw peg$buildException(
        message,
        null,
        input.substring(peg$savedPos, peg$currPos),
        peg$computeLocation(peg$savedPos, peg$currPos)
      );
    }

    function peg$computePosDetails(pos) {
      var details = peg$posDetailsCache[pos],
          p, ch;

      if (details) {
        return details;
      } else {
        p = pos - 1;
        while (!peg$posDetailsCache[p]) {
          p--;
        }

        details = peg$posDetailsCache[p];
        details = {
          line:   details.line,
          column: details.column,
          seenCR: details.seenCR
        };

        while (p < pos) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }

          p++;
        }

        peg$posDetailsCache[pos] = details;
        return details;
      }
    }

    function peg$computeLocation(startPos, endPos) {
      var startPosDetails = peg$computePosDetails(startPos),
          endPosDetails   = peg$computePosDetails(endPos);

      return {
        start: {
          offset: startPos,
          line:   startPosDetails.line,
          column: startPosDetails.column
        },
        end: {
          offset: endPos,
          line:   endPosDetails.line,
          column: endPosDetails.column
        }
      };
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, found, location) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0100-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1000-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new peg$SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        location
      );
    }

    function peg$parsestart() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseSkip();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseSkip();
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseTable();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseSkip();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parseSkip();
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c0(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseLineTerminator() {
      var s0;

      if (peg$c1.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c2); }
      }

      return s0;
    }

    function peg$parseWhiteSpace() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 9) {
        s0 = peg$c3;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c4); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 11) {
          s0 = peg$c5;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c6); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 12) {
            s0 = peg$c7;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c8); }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 32) {
              s0 = peg$c9;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c10); }
            }
            if (s0 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 160) {
                s0 = peg$c11;
                peg$currPos++;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c12); }
              }
              if (s0 === peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 65279) {
                  s0 = peg$c13;
                  peg$currPos++;
                } else {
                  s0 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c14); }
                }
                if (s0 === peg$FAILED) {
                  if (peg$c15.test(input.charAt(peg$currPos))) {
                    s0 = input.charAt(peg$currPos);
                    peg$currPos++;
                  } else {
                    s0 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c16); }
                  }
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parseEndOfLine() {
      var s0, s1;

      s0 = peg$parseLineTerminator();
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        peg$silentFails++;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c17); }
        }
        peg$silentFails--;
        if (s1 === peg$FAILED) {
          s0 = void 0;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }

      return s0;
    }

    function peg$parsePositiveInteger() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (peg$c18.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c19); }
      }
      if (s2 !== peg$FAILED) {
        s3 = [];
        if (peg$c20.test(input.charAt(peg$currPos))) {
          s4 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c21); }
        }
        if (s4 !== peg$FAILED) {
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c20.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c21); }
            }
          }
        } else {
          s3 = peg$FAILED;
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s0 = input.substring(s0, peg$currPos);
      } else {
        s0 = s1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (peg$c18.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c19); }
        }
        if (s1 !== peg$FAILED) {
          s0 = input.substring(s0, peg$currPos);
        } else {
          s0 = s1;
        }
      }

      return s0;
    }

    function peg$parseAloneComment() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 59) {
        s1 = peg$c22;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c23); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$currPos;
        peg$silentFails++;
        s5 = peg$parseEndOfLine();
        peg$silentFails--;
        if (s5 === peg$FAILED) {
          s4 = void 0;
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        if (s4 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c17); }
          }
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$currPos;
          peg$silentFails++;
          s5 = peg$parseEndOfLine();
          peg$silentFails--;
          if (s5 === peg$FAILED) {
            s4 = void 0;
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c17); }
            }
            if (s5 !== peg$FAILED) {
              s4 = [s4, s5];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseComment() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseWhiteSpace();
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parseWhiteSpace();
        }
      } else {
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseAloneComment();
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseRelaxComment() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseWhiteSpace();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseWhiteSpace();
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseAloneComment();
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseSkip() {
      var s0;

      s0 = peg$parseWhiteSpace();
      if (s0 === peg$FAILED) {
        s0 = peg$parseLineTerminator();
        if (s0 === peg$FAILED) {
          s0 = peg$parseAloneComment();
        }
      }

      return s0;
    }

    function peg$parseSeparator() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 38) {
        s0 = peg$c24;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c25); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 124) {
          s0 = peg$c26;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c27); }
        }
      }

      return s0;
    }

    function peg$parseInSeparator() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 94) {
        s0 = peg$c28;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c29); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 95) {
          s0 = peg$c30;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c31); }
        }
      }

      return s0;
    }

    function peg$parseNeckSeparator() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseWhiteSpace();
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parseWhiteSpace();
        }
      } else {
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c32();
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 38) {
          s0 = peg$c24;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c25); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 124) {
            s0 = peg$c26;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c27); }
          }
        }
      }

      return s0;
    }

    function peg$parseJustifier() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 60) {
        s0 = peg$c33;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c34); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 62) {
          s0 = peg$c35;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c36); }
        }
      }

      return s0;
    }

    function peg$parseEscaper() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 92) {
        s0 = peg$c37;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c38); }
      }

      return s0;
    }

    function peg$parseLineBreaker() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 92) {
        s0 = peg$c37;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c38); }
      }

      return s0;
    }

    function peg$parseNotCellCharacter() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$parseSeparator();
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parseWhiteSpace();
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parseWhiteSpace();
          }
        } else {
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseInSeparator();
          if (s2 !== peg$FAILED) {
            s3 = peg$currPos;
            peg$silentFails++;
            s4 = peg$parseWhiteSpace();
            peg$silentFails--;
            if (s4 !== peg$FAILED) {
              peg$currPos = s3;
              s3 = void 0;
            } else {
              s3 = peg$FAILED;
            }
            if (s3 !== peg$FAILED) {
              s4 = [];
              s5 = peg$parseRelaxComment();
              if (s5 === peg$FAILED) {
                s5 = peg$parseWhiteSpace();
              }
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = peg$parseRelaxComment();
                if (s5 === peg$FAILED) {
                  s5 = peg$parseWhiteSpace();
                }
              }
              if (s4 !== peg$FAILED) {
                s1 = [s1, s2, s3, s4];
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = [];
          s2 = peg$parseWhiteSpace();
          if (s2 !== peg$FAILED) {
            while (s2 !== peg$FAILED) {
              s1.push(s2);
              s2 = peg$parseWhiteSpace();
            }
          } else {
            s1 = peg$FAILED;
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parseLineBreaker();
            if (s2 !== peg$FAILED) {
              s3 = peg$currPos;
              peg$silentFails++;
              s4 = peg$parseSeparator();
              if (s4 === peg$FAILED) {
                s4 = peg$parseInSeparator();
                if (s4 === peg$FAILED) {
                  s4 = peg$parseEscaper();
                  if (s4 === peg$FAILED) {
                    s4 = peg$parseLineBreaker();
                    if (s4 === peg$FAILED) {
                      s4 = peg$parseJustifier();
                    }
                  }
                }
              }
              peg$silentFails--;
              if (s4 === peg$FAILED) {
                s3 = void 0;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
              if (s3 !== peg$FAILED) {
                s4 = [];
                s5 = peg$parseComment();
                if (s5 === peg$FAILED) {
                  s5 = peg$parseWhiteSpace();
                }
                while (s5 !== peg$FAILED) {
                  s4.push(s5);
                  s5 = peg$parseComment();
                  if (s5 === peg$FAILED) {
                    s5 = peg$parseWhiteSpace();
                  }
                }
                if (s4 !== peg$FAILED) {
                  s1 = [s1, s2, s3, s4];
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = [];
            s2 = peg$parseWhiteSpace();
            while (s2 !== peg$FAILED) {
              s1.push(s2);
              s2 = peg$parseWhiteSpace();
            }
            if (s1 !== peg$FAILED) {
              s2 = [];
              s3 = peg$parseJustifier();
              if (s3 !== peg$FAILED) {
                while (s3 !== peg$FAILED) {
                  s2.push(s3);
                  s3 = peg$parseJustifier();
                }
              } else {
                s2 = peg$FAILED;
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$currPos;
                peg$silentFails++;
                s4 = peg$parseWhiteSpace();
                peg$silentFails--;
                if (s4 !== peg$FAILED) {
                  peg$currPos = s3;
                  s3 = void 0;
                } else {
                  s3 = peg$FAILED;
                }
                if (s3 !== peg$FAILED) {
                  s1 = [s1, s2, s3];
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = peg$parseWhiteSpace();
              if (s1 !== peg$FAILED) {
                s2 = [];
                s3 = peg$parseJustifier();
                if (s3 !== peg$FAILED) {
                  while (s3 !== peg$FAILED) {
                    s2.push(s3);
                    s3 = peg$parseJustifier();
                  }
                } else {
                  s2 = peg$FAILED;
                }
                if (s2 !== peg$FAILED) {
                  s3 = [];
                  s4 = peg$parseRelaxComment();
                  if (s4 === peg$FAILED) {
                    s4 = peg$parseWhiteSpace();
                  }
                  while (s4 !== peg$FAILED) {
                    s3.push(s4);
                    s4 = peg$parseRelaxComment();
                    if (s4 === peg$FAILED) {
                      s4 = peg$parseWhiteSpace();
                    }
                  }
                  if (s3 !== peg$FAILED) {
                    s1 = [s1, s2, s3];
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$parseComment();
                if (s0 === peg$FAILED) {
                  s0 = peg$parseEndOfLine();
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parseCellCharacter() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parseEscaper();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseSeparator();
        if (s2 === peg$FAILED) {
          s2 = peg$parseInSeparator();
          if (s2 === peg$FAILED) {
            s2 = peg$parseEscaper();
            if (s2 === peg$FAILED) {
              s2 = peg$parseLineBreaker();
              if (s2 === peg$FAILED) {
                s2 = peg$parseJustifier();
              }
            }
          }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c39(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        s2 = peg$parseNotCellCharacter();
        peg$silentFails--;
        if (s2 === peg$FAILED) {
          s1 = void 0;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c17); }
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c40(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }

      return s0;
    }

    function peg$parseRelaxCellString() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseCellCharacter();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseCellCharacter();
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c41(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseCellString() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseCellCharacter();
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parseCellCharacter();
        }
      } else {
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c41(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseJustifierString() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseJustifier();
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parseJustifier();
        }
      } else {
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c42(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseSlashCell() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parseRelaxCellString();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parseWhiteSpace();
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parseWhiteSpace();
          }
        } else {
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseInSeparator();
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = peg$parseRelaxComment();
            if (s5 === peg$FAILED) {
              s5 = peg$parseWhiteSpace();
            }
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$parseRelaxComment();
              if (s5 === peg$FAILED) {
                s5 = peg$parseWhiteSpace();
              }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parseRelaxCellString();
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c43(s1, s3, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseCell() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$parseSlashCell();
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c44(s1);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseSlashCell();
        if (s1 === peg$FAILED) {
          s1 = peg$parseRelaxCellString();
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parseWhiteSpace();
          if (s3 !== peg$FAILED) {
            while (s3 !== peg$FAILED) {
              s2.push(s3);
              s3 = peg$parseWhiteSpace();
            }
          } else {
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parseLineBreaker();
            if (s3 !== peg$FAILED) {
              s4 = [];
              s5 = peg$parseComment();
              if (s5 === peg$FAILED) {
                s5 = peg$parseWhiteSpace();
              }
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = peg$parseComment();
                if (s5 === peg$FAILED) {
                  s5 = peg$parseWhiteSpace();
                }
              }
              if (s4 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c45(s1);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = [];
          s2 = peg$parseWhiteSpace();
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parseWhiteSpace();
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parseJustifierString();
            if (s2 !== peg$FAILED) {
              s3 = peg$currPos;
              peg$silentFails++;
              s4 = peg$parseWhiteSpace();
              peg$silentFails--;
              if (s4 !== peg$FAILED) {
                peg$currPos = s3;
                s3 = void 0;
              } else {
                s3 = peg$FAILED;
              }
              if (s3 !== peg$FAILED) {
                s4 = peg$parseSlashCell();
                if (s4 === peg$FAILED) {
                  s4 = peg$parseRelaxCellString();
                }
                if (s4 !== peg$FAILED) {
                  s5 = [];
                  s6 = peg$parseWhiteSpace();
                  if (s6 !== peg$FAILED) {
                    while (s6 !== peg$FAILED) {
                      s5.push(s6);
                      s6 = peg$parseWhiteSpace();
                    }
                  } else {
                    s5 = peg$FAILED;
                  }
                  if (s5 !== peg$FAILED) {
                    s6 = peg$parseJustifierString();
                    if (s6 !== peg$FAILED) {
                      s7 = [];
                      s8 = peg$parseRelaxComment();
                      if (s8 === peg$FAILED) {
                        s8 = peg$parseWhiteSpace();
                      }
                      while (s8 !== peg$FAILED) {
                        s7.push(s8);
                        s8 = peg$parseRelaxComment();
                        if (s8 === peg$FAILED) {
                          s8 = peg$parseWhiteSpace();
                        }
                      }
                      if (s7 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c46(s2, s4, s6);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = [];
            s2 = peg$parseWhiteSpace();
            while (s2 !== peg$FAILED) {
              s1.push(s2);
              s2 = peg$parseWhiteSpace();
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parseJustifierString();
              if (s2 !== peg$FAILED) {
                s3 = peg$currPos;
                peg$silentFails++;
                s4 = peg$parseWhiteSpace();
                peg$silentFails--;
                if (s4 !== peg$FAILED) {
                  peg$currPos = s3;
                  s3 = void 0;
                } else {
                  s3 = peg$FAILED;
                }
                if (s3 !== peg$FAILED) {
                  s4 = peg$parseSlashCell();
                  if (s4 === peg$FAILED) {
                    s4 = peg$parseRelaxCellString();
                  }
                  if (s4 !== peg$FAILED) {
                    s5 = [];
                    s6 = peg$parseWhiteSpace();
                    if (s6 !== peg$FAILED) {
                      while (s6 !== peg$FAILED) {
                        s5.push(s6);
                        s6 = peg$parseWhiteSpace();
                      }
                    } else {
                      s5 = peg$FAILED;
                    }
                    if (s5 !== peg$FAILED) {
                      s6 = peg$parseLineBreaker();
                      if (s6 !== peg$FAILED) {
                        s7 = [];
                        s8 = peg$parseComment();
                        if (s8 === peg$FAILED) {
                          s8 = peg$parseWhiteSpace();
                        }
                        while (s8 !== peg$FAILED) {
                          s7.push(s8);
                          s8 = peg$parseComment();
                          if (s8 === peg$FAILED) {
                            s8 = peg$parseWhiteSpace();
                          }
                        }
                        if (s7 !== peg$FAILED) {
                          peg$savedPos = s0;
                          s1 = peg$c47(s2, s4);
                          s0 = s1;
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = [];
              s2 = peg$parseWhiteSpace();
              while (s2 !== peg$FAILED) {
                s1.push(s2);
                s2 = peg$parseWhiteSpace();
              }
              if (s1 !== peg$FAILED) {
                s2 = peg$parseJustifierString();
                if (s2 !== peg$FAILED) {
                  s3 = peg$currPos;
                  peg$silentFails++;
                  s4 = peg$parseWhiteSpace();
                  peg$silentFails--;
                  if (s4 !== peg$FAILED) {
                    peg$currPos = s3;
                    s3 = void 0;
                  } else {
                    s3 = peg$FAILED;
                  }
                  if (s3 !== peg$FAILED) {
                    s4 = peg$parseSlashCell();
                    if (s4 === peg$FAILED) {
                      s4 = peg$parseRelaxCellString();
                    }
                    if (s4 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$c47(s2, s4);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                s1 = peg$parseSlashCell();
                if (s1 === peg$FAILED) {
                  s1 = peg$parseRelaxCellString();
                }
                if (s1 !== peg$FAILED) {
                  s2 = [];
                  s3 = peg$parseWhiteSpace();
                  if (s3 !== peg$FAILED) {
                    while (s3 !== peg$FAILED) {
                      s2.push(s3);
                      s3 = peg$parseWhiteSpace();
                    }
                  } else {
                    s2 = peg$FAILED;
                  }
                  if (s2 !== peg$FAILED) {
                    s3 = peg$parseJustifierString();
                    if (s3 !== peg$FAILED) {
                      s4 = [];
                      s5 = peg$parseRelaxComment();
                      if (s5 === peg$FAILED) {
                        s5 = peg$parseWhiteSpace();
                      }
                      while (s5 !== peg$FAILED) {
                        s4.push(s5);
                        s5 = peg$parseRelaxComment();
                        if (s5 === peg$FAILED) {
                          s5 = peg$parseWhiteSpace();
                        }
                      }
                      if (s4 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c48(s1, s3);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  s1 = peg$parseCellString();
                  if (s1 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c44(s1);
                  }
                  s0 = s1;
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parseNeckCell() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseJustifier();
      if (s2 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 61) {
          s2 = peg$c49;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c50); }
        }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parseJustifier();
          if (s2 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 61) {
              s2 = peg$c49;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c50); }
            }
          }
        }
      } else {
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c51(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseTable() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseHead();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseHead();
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseNeck();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseBody();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c52(s1, s2, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseRow() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = peg$parseCell();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parseSeparator();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseCell();
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parseSeparator();
          if (s4 !== peg$FAILED) {
            s5 = peg$parseCell();
            if (s5 !== peg$FAILED) {
              s4 = [s4, s5];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseComment();
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseEndOfLine();
            if (s4 !== peg$FAILED) {
              s5 = [];
              s6 = peg$parseSkip();
              while (s6 !== peg$FAILED) {
                s5.push(s6);
                s6 = peg$parseSkip();
              }
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c53(s1, s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$currPos;
        s3 = peg$parseSeparator();
        if (s3 !== peg$FAILED) {
          s4 = peg$parseCell();
          if (s4 !== peg$FAILED) {
            s3 = [s3, s4];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$currPos;
            s3 = peg$parseSeparator();
            if (s3 !== peg$FAILED) {
              s4 = peg$parseCell();
              if (s4 !== peg$FAILED) {
                s3 = [s3, s4];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$FAILED;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          }
        } else {
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseComment();
          if (s2 === peg$FAILED) {
            s2 = null;
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parseEndOfLine();
            if (s3 !== peg$FAILED) {
              s4 = [];
              s5 = peg$parseSkip();
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = peg$parseSkip();
              }
              if (s4 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c54(s1);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = [];
          s2 = peg$currPos;
          s3 = peg$parseCell();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseSeparator();
            if (s4 !== peg$FAILED) {
              s3 = [s3, s4];
              s2 = s3;
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            while (s2 !== peg$FAILED) {
              s1.push(s2);
              s2 = peg$currPos;
              s3 = peg$parseCell();
              if (s3 !== peg$FAILED) {
                s4 = peg$parseSeparator();
                if (s4 !== peg$FAILED) {
                  s3 = [s3, s4];
                  s2 = s3;
                } else {
                  peg$currPos = s2;
                  s2 = peg$FAILED;
                }
              } else {
                peg$currPos = s2;
                s2 = peg$FAILED;
              }
            }
          } else {
            s1 = peg$FAILED;
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parseRelaxComment();
            if (s2 === peg$FAILED) {
              s2 = null;
            }
            if (s2 !== peg$FAILED) {
              s3 = peg$parseEndOfLine();
              if (s3 !== peg$FAILED) {
                s4 = [];
                s5 = peg$parseSkip();
                while (s5 !== peg$FAILED) {
                  s4.push(s5);
                  s5 = peg$parseSkip();
                }
                if (s4 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c55(s1);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parseSeparator();
            if (s1 !== peg$FAILED) {
              s2 = [];
              s3 = peg$currPos;
              s4 = peg$parseCell();
              if (s4 !== peg$FAILED) {
                s5 = peg$parseSeparator();
                if (s5 !== peg$FAILED) {
                  s4 = [s4, s5];
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
              while (s3 !== peg$FAILED) {
                s2.push(s3);
                s3 = peg$currPos;
                s4 = peg$parseCell();
                if (s4 !== peg$FAILED) {
                  s5 = peg$parseSeparator();
                  if (s5 !== peg$FAILED) {
                    s4 = [s4, s5];
                    s3 = s4;
                  } else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parseRelaxComment();
                if (s3 === peg$FAILED) {
                  s3 = null;
                }
                if (s3 !== peg$FAILED) {
                  s4 = peg$parseEndOfLine();
                  if (s4 !== peg$FAILED) {
                    s5 = [];
                    s6 = peg$parseSkip();
                    while (s6 !== peg$FAILED) {
                      s5.push(s6);
                      s6 = peg$parseSkip();
                    }
                    if (s5 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$c56(s2);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          }
        }
      }

      return s0;
    }

    function peg$parseHead() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      s2 = peg$parseNeck();
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = void 0;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseRow();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c57(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseNeck() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = peg$parseNeckCell();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parseNeckSeparator();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseNeckCell();
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parseNeckSeparator();
          if (s4 !== peg$FAILED) {
            s5 = peg$parseNeckCell();
            if (s5 !== peg$FAILED) {
              s4 = [s4, s5];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseRelaxComment();
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseEndOfLine();
            if (s4 !== peg$FAILED) {
              s5 = [];
              s6 = peg$parseSkip();
              while (s6 !== peg$FAILED) {
                s5.push(s6);
                s6 = peg$parseSkip();
              }
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c58(s1, s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseBody() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseLiver();
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parseLiver();
        }
      } else {
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parseRib();
        if (s4 !== peg$FAILED) {
          s5 = [];
          s6 = peg$parseLiver();
          if (s6 !== peg$FAILED) {
            while (s6 !== peg$FAILED) {
              s5.push(s6);
              s6 = peg$parseLiver();
            }
          } else {
            s5 = peg$FAILED;
          }
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parseRib();
          if (s4 !== peg$FAILED) {
            s5 = [];
            s6 = peg$parseLiver();
            if (s6 !== peg$FAILED) {
              while (s6 !== peg$FAILED) {
                s5.push(s6);
                s6 = peg$parseLiver();
              }
            } else {
              s5 = peg$FAILED;
            }
            if (s5 !== peg$FAILED) {
              s4 = [s4, s5];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c59(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseLiver() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      s2 = peg$parseRib();
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = void 0;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseRow();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c57(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseRib() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3) === peg$c60) {
        s1 = peg$c60;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c61); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (input.charCodeAt(peg$currPos) === 45) {
          s3 = peg$c62;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c63); }
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          if (input.charCodeAt(peg$currPos) === 45) {
            s3 = peg$c62;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c63); }
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseRelaxComment();
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseEndOfLine();
            if (s4 !== peg$FAILED) {
              s5 = [];
              s6 = peg$parseSkip();
              while (s6 !== peg$FAILED) {
                s5.push(s6);
                s6 = peg$parseSkip();
              }
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c64();
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(
        null,
        peg$maxFailExpected,
        peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
        peg$maxFailPos < input.length
          ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
          : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
      );
    }
  }

  return {
    SyntaxError: peg$SyntaxError,
    parse:       peg$parse
  };
})();
},{}]},{},[1]);
