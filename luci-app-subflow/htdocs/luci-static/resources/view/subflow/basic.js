'use strict';
'require dom';
'require fs';
'require form';
'require poll';
'require rpc';
'require uci';
'require ui';
'require view';

const callServiceList = rpc.declare({
	object: 'service',
	method: 'list',
	params: [ 'name' ],
	expect: { '': {} }
});

/* procd only names the instance "subflow" when the init script passes a name,
 * otherwise it falls back to "instance1". Match on any running instance so the
 * status is reported correctly regardless of the instance name. */
function getServiceStatus() {
	return L.resolveDefault(callServiceList('subflow'), {}).then(function (res) {
		try {
			var instances = res.subflow.instances || {};
			return Object.keys(instances).some(function (name) {
				return instances[name].running === true;
			});
		}
		catch (e) {
			return false;
		}
	});
}

return view.extend({
	load: function () {
		return uci.load('subflow');
	},

	/* rpcd only emits a procd config.change event after applying UCI, and the
	 * procd reload trigger only fires for services it already knows about. Right
	 * after installing, SubFlow has never started, so enabling it would do
	 * nothing. Reload explicitly, but only after the committed value matches the
	 * form target so the reload never races the asynchronous apply. */
	handleSaveApply: function (ev, mode) {
		return this.handleSave(ev).then(function () {
			ui.changes.apply(mode == '0');

			var target = uci.get('subflow', 'main', 'enabled');
			var tries = 0;

			(function resync() {
				tries++;
				uci.load('subflow').then(function () {
					if (uci.get('subflow', 'main', 'enabled') === target || tries >= 20)
						fs.exec('/etc/init.d/subflow', [ 'reload' ]).catch(function () {});
					else
						window.setTimeout(resync, 500);
				}).catch(function () {
					window.setTimeout(resync, 500);
				});
			})();
		});
	},

	render: function () {
		var m, s, o;

		m = new form.Map('subflow', _('SubFlow'),
			_('Self-hosted subscription management and node processing platform.'));

		var statusP = E('p', { 'id': 'subflow_status' },
			E('em', _('Collecting data...')));
		var lastRunning = null;

		function buildStatus(running) {
			if (!running)
				return E([ E('em', [ E('b', { 'style': 'color:red' }, _('SubFlow is not running')) ]) ]);

			var port = uci.get('subflow', 'main', 'port') || '8080';
			var url = window.location.protocol + '//' + window.location.hostname + ':' + port;

			return E([
				E('em', [ E('b', { 'style': 'color:green' }, _('SubFlow is running')) ]),
				' ',
				E('a', {
					'class': 'cbi-button cbi-button-action',
					'href': url,
					'target': '_blank',
					'rel': 'noopener noreferrer'
				}, [ _('Open Web Interface') ])
			]);
		}

		s = m.section(form.TypedSection);
		s.anonymous = true;
		s.render = () => {
			setTimeout(function () {
				poll.add(function () {
					return getServiceStatus().then(function (running) {
						if (running === lastRunning)
							return;

						lastRunning = running;
						dom.content(statusP, buildStatus(running));
					});
				}, 3);
			}, 100);

			return E('div', { 'class': 'cbi-section' }, [ statusP ]);
		};

		s = m.section(form.NamedSection, 'main', 'subflow');
		s.anonymous = true;

		o = s.option(form.Flag, 'enabled', _('Enable'),
			_('Enable SubFlow and start it automatically on boot.'));
		o.default = o.disabled;
		o.rmempty = false;

		o = s.option(form.Value, 'port', _('Web Admin Port'),
			_('Port used by the SubFlow web interface.'));
		o.default = '8080';
		o.datatype = 'port';
		o.rmempty = false;

		o = s.option(form.Value, 'data_dir', _('Data Directory'),
			_('Directory used to persist SubFlow data.'));
		o.default = '/etc/subflow';
		o.rmempty = false;

		return m.render();
	}
});
