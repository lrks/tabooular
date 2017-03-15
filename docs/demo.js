'use strict';
var jQuery = require('jquery');
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