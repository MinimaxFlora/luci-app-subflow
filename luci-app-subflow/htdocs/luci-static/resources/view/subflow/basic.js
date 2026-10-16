'use strict';
'require form';
'require fs';
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

/* procd names the instance "instance1" when the init script calls
 * procd_open_instance without an explicit name, so match any running instance
 * instead of assuming a fixed key. */
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

function renderStatus(running, port) {
	var span = '<span style="color:%s"><strong>%s</strong></span>';

	if (!running)
		return span.format('red', _('SubFlow is not running'));

	var link = String.format(
		'&#160;<a class="btn cbi-button cbi-button-action" href="http://%s:%s" target="_blank" rel="noreferrer noopener">%s</a>',
		window.location.hostname, port, _('Open Web Interface'));

	return span.format('green', _('SubFlow is running')) + link;
}

return view.extend({
	load: function () {
		return uci.load('subflow');
	},

	/* Reload the service right after applying: the rpcd config.change trigger
	 * only reaches services procd already knows about, so a freshly installed
	 * SubFlow would never start from the enable toggle alone. */
	handleSaveApply: function (ev, mode) {
		return this.handleSave(ev).then(function () {
			ui.changes.apply(mode == '0');

			window.setTimeout(function () {
				fs.exec('/etc/init.d/subflow', [ 'reload' ]).catch(function () {});
			}, 1000);
		});
	},

	render: function () {
		var m, s, o;

		m = new form.Map('subflow', _('SubFlow'),
			_('Self-hosted subscription management and node processing platform.'));

		s = m.section(form.TypedSection);
		s.anonymous = true;
		s.render = function () {
			poll.add(function () {
				return getServiceStatus().then(function (running) {
					var el = document.getElementById('subflow_status');

					if (el)
						el.innerHTML = renderStatus(running,
							uci.get('subflow', 'main', 'port') || '8080');
				});
			}, 3);

			return E('div', { 'class': 'cbi-section' }, [
				E('p', { 'id': 'subflow_status' }, _('Collecting data...'))
			]);
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
