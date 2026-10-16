#
# This is free software, licensed under the GNU Affero General Public License v3.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=subflow
PKG_VERSION:=0.2.2
PKG_RELEASE:=1

PKG_SOURCE_URL:=https://github.com/MinimaxFlora/SubFlow/releases/download/v$(PKG_VERSION)

PKG_MAINTAINER:=MinimaxFlora
PKG_LICENSE:=AGPL-3.0-only

# SubFlow releases ship one fully static binary per GOARCH, with the web
# frontend already embedded, so this package repackages a release asset instead
# of compiling Go. Static linking is what allows the upstream binary to run on
# musl based OpenWrt without any libc dependency.
ifeq ($(ARCH),aarch64)
  SUBFLOW_TARGET:=linux-arm64
  PKG_HASH:=083bbad6a19bfaea5eb4722c93489140f335bc1c1eee67ed6a1dd9f3ad9684c2
else ifeq ($(ARCH),arm)
  # Mirror the FPU heuristic that OpenWrt's Golang infrastructure uses to pick
  # GOARM, so each board gets the matching armv5 / armv6 / armv7 asset.
  SUBFLOW_FPU:=$(word 2,$(subst +,$(space),$(call qstrip,$(CONFIG_CPU_TYPE))))
  ifeq ($(SUBFLOW_FPU),)
    SUBFLOW_TARGET:=linux-armv5
    PKG_HASH:=273a9c5cf7c24330e82962a6d9a2e1824f736bad8304c6cc27ea9533ad7a3c1f
  else ifneq ($(filter $(SUBFLOW_FPU),vfp vfpv2),)
    SUBFLOW_TARGET:=linux-armv6
    PKG_HASH:=eec11b28112b959899138cb84fdd889f41d6fe5040d1e7c4cdc7d36d0ab890bf
  else
    SUBFLOW_TARGET:=linux-armv7
    PKG_HASH:=735f839c71d6d443504c7106961b4bce1b4366cbae114c55b1ce49a37b171393
  endif
else ifeq ($(ARCH),x86_64)
  SUBFLOW_TARGET:=linux-amd64
  PKG_HASH:=47e2062151c6eba1860b8b4e435281b392a64e98fe953ff6b64a8b3090ed42f2
else ifeq ($(ARCH),i386)
  SUBFLOW_TARGET:=linux-386
  PKG_HASH:=d0c23ecaa84c209f6adc2fe002433e4092839e02079a59d4467789939bcc5994
endif

ifneq ($(SUBFLOW_TARGET),)
  PKG_SOURCE:=subflow-$(SUBFLOW_TARGET).tar.gz
endif

PKG_BUILD_DIR:=$(BUILD_DIR)/subflow-$(PKG_VERSION)

include $(INCLUDE_DIR)/package.mk

# The release archive holds the bare binary at its top level, so extract it
# straight into PKG_BUILD_DIR instead of the default "$(PKG_BUILD_DIR)/..".
ifneq ($(SUBFLOW_TARGET),)
  PKG_UNPACK:=$(HOST_TAR) -C $(PKG_BUILD_DIR) -xzf $(DL_DIR)/$(PKG_SOURCE)
endif

# The archive only contains a prebuilt binary, so there is nothing to compile.
# Without this the default Build/Compile runs "make" in an empty directory and
# fails with "No targets specified and no makefile found".
define Build/Compile
endef

define Package/subflow
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=Web Servers/Proxies
  TITLE:=SubFlow subscription management server
  URL:=https://github.com/MinimaxFlora/SubFlow
  # Only the architectures with a published release asset.
  DEPENDS:=@(aarch64||arm||i386||x86_64)
endef

define Package/subflow/description
  SubFlow is a self-hosted subscription management and node processing
  platform. A single static binary serves both the API and the embedded Vue
  web interface.
endef

define Package/subflow/conffiles
/etc/config/subflow
endef

define Package/subflow/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/subflow-$(SUBFLOW_TARGET) $(1)/usr/bin/subflow

	$(INSTALL_DIR) $(1)/etc/init.d $(1)/etc/config
	$(INSTALL_BIN) $(CURDIR)/files/subflow.init $(1)/etc/init.d/subflow
	$(INSTALL_CONF) $(CURDIR)/files/subflow.config $(1)/etc/config/subflow
endef

define Package/subflow/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
/etc/init.d/subflow enable
/etc/init.d/subflow restart
exit 0
endef

define Package/subflow/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
/etc/init.d/subflow stop
/etc/init.d/subflow disable
exit 0
endef

$(eval $(call BuildPackage,subflow))
