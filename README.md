# luci-app-subflow

OpenWrt LuCI integration for [SubFlow](https://github.com/MinimaxFlora/SubFlow),
a self-hosted subscription management and node processing platform.

The package runs the SubFlow binary as a procd service and provides a
management page inside LuCI under **Services > SubFlow**.

## How it works

SubFlow is a single Go binary that serves both its API and an embedded Vue
frontend on one port. The package runs it as a procd service and adds a LuCI
page with two tabs:

- **Basic Setting** shows the service state with an **Open Web Interface**
  button while running, and edits the enable switch, the web admin port and the
  data directory.
- **Logs** shows the syslog output filtered to the `subflow` tag.

The service starts disabled (`enabled '0'`). Turn on **Enable** and press
**Save & Apply** to start it right away; the setting is persisted, so SubFlow
is then started automatically on boot. An **Open Web Interface** button appears
next to the status once it runs. The SubFlow web interface is served by the
service itself on its own port, so it can also be opened directly in a browser:

```
   browser
      |
      +--> http://<router>/            LuCI :80  -> Services > SubFlow
      |
      +--> http://<router>:8080/       SubFlow API + embedded UI
```

## Repository layout

```
subflow/              the subflow binary package
luci-app-subflow/     the LuCI application (menu entry, Basic Setting and Logs views)
.github/workflows/    the SDK build workflow
```

## Building

The package downloads the matching binary from the SubFlow GitHub release, so
no Go toolchain is needed; the release asset already embeds the frontend.

### With the SDK directly

```sh
# From an OpenWrt buildroot or SDK root
git clone https://github.com/MinimaxFlora/luci-app-subflow package/luci-app-subflow

make menuconfig          # LuCI -> Applications -> luci-app-subflow
make package/luci-app-subflow/compile V=s
```

Requirements: the `luci` feed. The only build dependency is downloading the
release asset.

### With CI

`.github/workflows/build.yml` builds the packages through
[`sbwml/openwrt-gh-action-sdk`](https://github.com/sbwml/openwrt-gh-action-sdk),
which runs the official OpenWrt SDK container for each architecture and
release. It runs on every push to `main`/`master`, on pull requests, and on
tags. Tagged builds also attach the packages to the GitHub release.

The matrix currently covers:

| `ARCH` | OpenWrt tag | Package format |
| ------ | ----------- | -------------- |
| `x86_64` | `openwrt-24.10` | `.ipk` |
| `x86_64` | `openwrt-25.12` | `.apk` |
| `aarch64_cortex-a53` | `openwrt-24.10` | `.ipk` |
| `aarch64_cortex-a53` | `openwrt-25.12` | `.apk` |

OpenWrt 24.10 uses opkg and produces `.ipk`; OpenWrt 25.12 uses apk and
produces `.apk`. Each SDK container carries the matching package manager, so
both formats come out of the same workflow. Add entries to `matrix.arch` or
`matrix.tag` to cover more targets.

### Supported architectures

`subflow/Makefile` maps the OpenWrt `ARCH` to the published release asset:

| OpenWrt `ARCH` | Release asset | Notes |
| -------------- | ------------- | ----- |
| `aarch64` | `linux-arm64` | |
| `arm` | `armv5` / `armv6` / `armv7` | chosen from `CONFIG_CPU_TYPE`, same heuristic as the OpenWrt Golang package |
| `x86_64` | `linux-amd64` | |
| `i386` | `linux-386` | |

The binaries are statically linked (`CGO_ENABLED=0`), so they run on musl based
OpenWrt with no libc dependency. Other architectures are excluded through
`DEPENDS` because upstream publishes no asset for them.

### Updating the version

Set `PKG_VERSION` to the new tag and refresh each `PKG_HASH` from the release
`SHA256SUMS`:

```sh
curl -fsSL https://github.com/MinimaxFlora/SubFlow/releases/download/v0.2.2/SHA256SUMS
```

## Configuration

Runtime settings live in `/etc/config/subflow`:

| Option | Default | Meaning |
| ------ | ------- | ------- |
| `enabled` | `0` | Start the service now and on boot (set by the **Enable** switch) |
| `port` | `8080` | Web admin port of the SubFlow UI |
| `data_dir` | `/etc/subflow` | Persistent data and `subflow.db` |

The Basic Setting page writes `enabled`, `port` and `data_dir` through UCI. The
following advanced options are honoured by the init script but are not shown in
the UI; set them with `uci set` if needed:

| Option | Default | Meaning |
| ------ | ------- | ------- |
| `host` | `0.0.0.0` | Listen address |
| `log_level` | `info` | `debug`, `info`, `warn` or `error` |
| `fetch_user_agent` | (empty) | User-Agent for remote subscription fetches |
| `fetch_allow_private_hosts` | `0` | Allow fetching from private addresses |

Use **Save & Apply** to persist a change and restart a running service.

```sh
/etc/init.d/subflow restart
```

Keep `host` on `0.0.0.0` so the web UI is reachable from your computer; a
service bound to `127.0.0.1` is only reachable from the router itself. It is
not exposed in the UI to keep the Basic Setting page minimal.

## Access

SubFlow has no built-in login. Keep the port on the LAN only; do not expose it
to the WAN (no firewall rule is installed by this package).

## Notes

The Logs tab reads the system log and filters it by the `subflow` tag, which
matches the tag used by procd for the service output.

## License

AGPL-3.0-only, matching SubFlow. See `LICENSE`.
