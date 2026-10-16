'use strict';
'require fs';
'require poll';
'require view';

function findLogread() {
	return Promise.all([
		L.resolveDefault(fs.stat('/sbin/logread'), null),
		L.resolveDefault(fs.stat('/usr/sbin/logread'), null)
	]).then(function (stat) {
		return stat[0] ? stat[0].path : stat[1] ? stat[1].path : null;
	});
}

return view.extend({
	load: function () {
		return findLogread();
	},

	render: function (logger) {
		var output = E('textarea', {
			'id': 'subflow_log',
			'class': 'cbi-input-textarea',
			'style': 'width: 100% !important; min-height: 500px; font-family: monospace',
			'readonly': 'readonly',
			'wrap': 'off',
			'rows': 25
		});

		if (logger) {
			poll.add(function () {
				return L.resolveDefault(fs.exec_direct(logger, [ '-e', 'subflow' ]), '').then(function (res) {
					output.value = (res && res.trim()) ? res.trim() : _('No log data.');
					output.scrollTop = output.scrollHeight;
				});
			});
		}
		else {
			output.value = _('No log data.');
		}

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
