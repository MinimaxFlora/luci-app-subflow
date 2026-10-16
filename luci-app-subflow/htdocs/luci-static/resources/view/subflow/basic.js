'use strict';
'require form';
'require poll';
'require rpc';
'require uci';
'require view';

const callServiceList = rpc.declare({
	object: 'service',
	method: 'list',
	params: [ 'name' ],
	expect: { '': {} }
});

function getServiceStatus() {
	return L.resolveDefault(callServiceList('subflow'), {}).then(function (res) {
		try {
			return res.subflow.instances.subflow.running === true;
		}
		catch (e) {
			return false;
		}
	});
}

function renderStatus(isRunning) {
	return '<em><span style="color:%s"><strong>%s</strong></span></em>'.format(
		isRunning ? 'green' : 'red',
		isRunning ? _('SubFlow is running') : _('SubFlow is not running'));
}

return view.extend({
	load: function () {
		return uci.load('subflow');
	},

	render: function () {
		var m, s, o;

		m = new form.Map('subflow', _('SubFlow'),
			_('Self-hosted subscription management and node processing platform.'));

		s = m.section(form.TypedSection);
		s.anonymous = true;
		s.render = () => {
			setTimeout(function () {
				poll.add(function () {
					return getServiceStatus().then(function (isRunning) {
						var el = document.getElementById('subflow_status');
						if (el)
							el.innerHTML = renderStatus(isRunning);
					});
				});
			}, 100);

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
