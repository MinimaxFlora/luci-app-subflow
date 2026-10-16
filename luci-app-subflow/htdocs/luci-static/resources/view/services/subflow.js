'use strict';
'require view';
'require uci';

return view.extend({
	load: function () {
		return uci.load('subflow');
	},

	render: function () {
		var port = uci.get('subflow', 'main', 'port') || '8080';
		// Reuse the host the browser used to reach LuCI, so accessing the page
		// through an IP or a hostname both point at the running service.
		var target = '//' + window.location.hostname + ':' + port + '/';

		return E('div', {
			'class': 'cbi-map',
			'style': 'width:100%;max-width:1600px;'
		}, [
			E('div', {
				'style': 'height:calc(100vh - 180px);min-height:640px;' +
					'overflow:hidden;border-radius:10px;background:#f2f2f2;'
			}, [
				E('iframe', {
					'src': target,
					'style': 'width:100%;height:100%;border:none;'
				})
			])
		]);
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
