# luci-app-subflow

OpenWrt LuCI integration for [SubFlow](https://github.com/MinimaxFlora/SubFlow),
a self-hosted subscription management and node processing platform.

The package runs the SubFlow binary as a procd service and exposes its web
interface inside LuCI under **Services > SubFlow**.

## How it works

SubFlow is a single Go binary that serves both its API and an embedded Vue
frontend on one port. The LuCI page does not proxy anything through uhttpd:
it simply embeds the running service in an iframe.

```
        browser
           |
   +-------+---------------------------+
   |                                   |
   |  LuCI / uhttpd :80                |  SubFlow :8080
   |  Services > SubFlow               |  API + embedded UI
   |  <iframe src="//HOST:8080/">  ----+-->  served by subflow
   |
```

This is the same shape used by other router web apps such as OpenClash and
PassWall, and it needs no nginx, no Unix socket and no reverse proxy, because
uhttpd does not provide one.

## Repository layout

```
subflow/              the subflow binary package
luci-app-subflow/     the LuCI application (menu entry and iframe page)
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
| `enabled` | `1` | Start the service on boot |
| `host` | `0.0.0.0` | Listen address |
| `port` | `8080` | Listen port, also used by the LuCI iframe |
| `data_dir` | `/etc/subflow` | Persistent data and `subflow.db` |
| `log_level` | `info` | `debug`, `info`, `warn` or `error` |
| `fetch_user_agent` | (empty) | User-Agent for remote subscription fetches |
| `fetch_allow_private_hosts` | `0` | Allow fetching from private addresses |

After changing the port, the LuCI page reads the new value automatically.

```sh
/etc/init.d/subflow restart
```

`host` stays `0.0.0.0` because the iframe is loaded by your browser: a service
bound to `127.0.0.1` on the router would be unreachable from your computer.

## Access

SubFlow has no built-in login and the LuCI page relies on LuCI's own
authentication. Keep the port on the LAN only; do not expose it to the WAN
(no firewall rule is installed by this package).

## Notes

The LuCI page uses a protocol-relative URL (`//host:port/`), which requires the
LuCI session to be plain HTTP. If you serve LuCI over HTTPS, open SubFlow
directly in a new tab instead of the iframe.

## License

AGPL-3.0-only, matching SubFlow. See `LICENSE`.
