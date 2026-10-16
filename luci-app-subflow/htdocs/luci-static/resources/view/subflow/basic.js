'use strict';
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
	var spanTemp = '<em><span style="color:%s"><strong>%s</strong></span></em>';

	return isRunning
		? spanTemp.format('green', _('SubFlow is running'))
		: spanTemp.format('red', _('SubFlow is not running'));
}

return view.extend({
	load: function () {
		return uci.load('subflow');
	},

	setEnabled: function (enabled) {
		uci.set('subflow', 'main', 'enabled', enabled ? '1' : '0');

		return uci.save().then(function () {
			return uci.apply();
		}).catch(function (e) {
			ui.addNotification(null, E('p',
				_('Unable to apply changes.') + ' ' + (e && e.message ? e.message : e)), 'error');
		});
	},

	handleStart: function () {
		return this.setEnabled(true);
	},

	handleStop: function () {
		return this.setEnabled(false);
	},

	handleRestart: function () {
		return this.setEnabled(true);
	},

	render: function () {
		var m, s, o;

		m = new form.Map('subflow', _('SubFlow'),
			_('Self-hosted subscription management and node processing platform.'));

		s = m.section(form.TypedSection);
		s.anonymous = true;
		s.render = () => {
			poll.add(function () {
				return getServiceStatus().then(function (isRunning) {
					var el = document.getElementById('subflow_status');
					if (el)
						el.innerHTML = renderStatus(isRunning);
				});
			}, 5);

			var actionButton = (title, action, style) => E('button', {
				'class': 'btn cbi-button ' + style,
				'click': ui.createHandlerFn(this, action)
			}, [ title ]);

			return E('div', { 'class': 'cbi-section' }, [
				E('p', { 'id': 'subflow_status' }, _('Collecting data...')),
				E('div', { 'class': 'cbi-section-actions' }, [
					actionButton(_('Start'), 'handleStart', 'cbi-button-apply'),
					actionButton(_('Stop'), 'handleStop', 'cbi-button-reset'),
					actionButton(_('Restart'), 'handleRestart', 'cbi-button-neutral')
				]),
				E('div', { 'class': 'cbi-value-description' }, [
					_('Start enables SubFlow and starts it automatically on boot.')
				])
			]);
		};

		s = m.section(form.NamedSection, 'main', 'subflow');
		s.anonymous = true;

		o = s.option(form.Value, 'host', _('Listen Address'));
		o.default = '0.0.0.0';
		o.rmempty = false;

		o = s.option(form.Value, 'port', _('Listen Port'));
		o.default = '8080';
		o.datatype = 'port';
		o.rmempty = false;

		o = s.option(form.ListValue, 'log_level', _('Log Level'));
		o.value('debug', _('Debug'));
		o.value('info', _('Info'));
		o.value('warn', _('Warning'));
		o.value('error', _('Error'));
		o.default = 'info';
		o.rmempty = false;

		o = s.option(form.Value, 'data_dir', _('Data Directory'),
			_('Directory used to persist SubFlow data.'));
		o.default = '/etc/subflow';
		o.rmempty = false;

		o = s.option(form.Value, 'fetch_user_agent', _('Fetch User-Agent'),
			_('User-Agent sent when fetching remote subscriptions. Leave it empty to use the built-in default.'));

		o = s.option(form.Flag, 'fetch_allow_private_hosts', _('Allow Private Hosts'),
			_('Allow fetching subscriptions from private network addresses. Disabled by default to avoid SSRF.'));
		o.default = o.disabled;

		return m.render();
	}
});
