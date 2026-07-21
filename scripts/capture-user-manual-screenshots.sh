#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIB_CACHE_DIR="/tmp/eclick-playwright-libs"
NSPR_DIR="/tmp/nspr-libs"
NSS_DIR="/tmp/nss-libs"
ALSA_DIR="/tmp/alsa-libs"

mkdir -p "$LIB_CACHE_DIR" "$NSPR_DIR" "$NSS_DIR" "$ALSA_DIR"

prepare_lib() {
  local package_name="$1"
  local target_dir="$2"
  local marker_glob="$3"

  if compgen -G "$marker_glob" >/dev/null 2>&1; then
    return 0
  fi

  (
    cd "$LIB_CACHE_DIR"
    apt download "$package_name" >/dev/null
    local deb_file
    deb_file="$(ls -t "${package_name}"_*.deb | head -n 1)"
    dpkg-deb -x "$deb_file" "$target_dir"
  )
}

prepare_lib "libnspr4" "$NSPR_DIR" "$NSPR_DIR/usr/lib/x86_64-linux-gnu/libnspr4.so"
prepare_lib "libnss3" "$NSS_DIR" "$NSS_DIR/usr/lib/x86_64-linux-gnu/libnss3.so"
prepare_lib "libasound2t64" "$ALSA_DIR" "$ALSA_DIR/usr/lib/x86_64-linux-gnu/libasound.so.2"

export LD_LIBRARY_PATH="$NSPR_DIR/usr/lib/x86_64-linux-gnu:$NSS_DIR/usr/lib/x86_64-linux-gnu:$ALSA_DIR/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH:-}"

cd "$ROOT_DIR/apps/web"
bunx playwright test --config=playwright.user-manual.config.ts --project=chromium
