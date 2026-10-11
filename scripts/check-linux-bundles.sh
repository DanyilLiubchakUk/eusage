#!/usr/bin/env bash
set -euo pipefail

bundle_dir=$(realpath "$1")
version=$2
check_dir=$3
deb="$bundle_dir/deb/eUsage_${version}_amd64.deb"
appimage="$bundle_dir/appimage/eUsage_${version}_amd64.AppImage"
for package in "$deb" "$appimage"; do
  test -s "$package" || { echo "Missing Linux package: $package"; exit 1; }
done
test "$(dpkg-deb --field "$deb" Version)" = "$version" || { echo "DEB version does not match $version"; exit 1; }
dpkg-deb --field "$deb" Depends | grep -Eq '(^|, )sqlite3([ ,(]|$)'

# The caller supplies a new task-owned directory. Never install the package.
mkdir "$check_dir"
dpkg-deb --extract "$deb" "$check_dir/deb"
cd "$check_dir"
"$appimage" --appimage-extract > appimage-extraction.log
test -x squashfs-root/usr/bin/sqlite3 || { echo "AppImage is missing executable SQLite"; exit 1; }
for root in deb squashfs-root; do
  if find "$root" -name sqlite3.exe -print -quit | grep -q .; then
    echo "Windows SQLite unexpectedly packaged in $root"
    exit 1
  fi
  ldd "$root/usr/bin/eusage" > "$root-linking.log"
  if grep -q 'not found' "$root-linking.log"; then
    cat "$root-linking.log"
    exit 1
  fi
done

# Use only an in-memory fixture, with the AppImage's bundled libraries.
test "$(env -i PATH=/usr/bin:/bin LD_LIBRARY_PATH="$PWD/squashfs-root/usr/lib" \
  "$PWD/squashfs-root/usr/bin/sqlite3" :memory: 'select 42;')" = 42
printf 'DEB and AppImage metadata, linking and bundled SQLite passed for %s\n' "$version"
