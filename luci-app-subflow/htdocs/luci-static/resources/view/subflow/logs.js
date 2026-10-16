'use strict';
'require poll';
'require rpc';
'require view';

/* Read the syslog ring buffer through ubus, the same way luci-mod-status does.
 * Filtering by tag in JavaScript keeps this working regardless of where the
 * logread helper lives or whether the CGI exec endpoint is reachable. */
const callLogRead = rpc.declare({
	object: 'log',
	method: 'read',
	params: [ 'lines', 'stream', 'oneshot' ],
	expect: { log: [] }
});

function filterEntries(entries) {
	return (entries || [])
		.map(function (entry) { return entry && entry.msg ? entry.msg : ''; })
		.filter(function (msg) { return msg.indexOf('subflow') !== -1; })
		.join('\n');
}

return view.extend({
	render: function () {
		var output = E('textarea', {
			'id': 'subflow_log',
			'class': 'cbi-input-textarea',
			'style': 'width: 100% !important; min-height: 500px; font-family: monospace',
			'readonly': 'readonly',
			'wrap': 'off',
			'rows': 25
		});

		poll.add(function () {
			return L.resolveDefault(callLogRead(1000, false, true), []).then(function (entries) {
				var text = filterEntries(entries);

				output.value = text || _('No log data.');
				output.scrollTop = output.scrollHeight;
			});
		}, 5);

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('SubFlow Log')),
			E('div', { 'class': 'cbi-section' }, [
				E('div', { 'class': 'cbi-section-descr' },
					_('The syslog output, pre-filtered for messages related to SubFlow.')),
				output
			])
		]);
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
