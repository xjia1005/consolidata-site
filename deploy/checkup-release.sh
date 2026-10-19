#!/usr/bin/env bash
# Git-backed static release; never changes nginx, DNS, credentials or other sites.
set -euo pipefail
action="${1:-}"
revision="${2:-}"
[[ "$revision" =~ ^[0-9a-f]{40}$ ]] || { echo 'Full 40-character revision required' >&2; exit 2; }
readonly repo_root=/opt/consolidata-site/repo
readonly site_root=/srv/www/cdatats
cd "$repo_root"
test "$(git remote get-url origin)" = 'https://github.com/xjia1005/consolidata-site.git'
test -z "$(git status --porcelain)"
previous="$(readlink -f "$site_root/current")"
case "$previous" in "$site_root"/releases/*) ;; *) echo 'Unexpected current release' >&2; exit 2;; esac
if test "$action" = release; then
  git fetch origin
  git merge-base --is-ancestor "$revision" origin/main
  git checkout --detach "$revision"
  test "$(git rev-parse HEAD)" = "$revision"
  test -z "$(git status --porcelain)"
  test -z "$(find site -type l -print -quit)"
  python3 tools/validate-checkup.py
  release_dir="$site_root/releases/$revision"
  sudo test ! -e "$release_dir"
  stage="$(sudo mktemp -d "$site_root/.staging-$revision.XXXXXX")"
  sudo cp -a site/. "$stage/"
  sudo chown -R root:root "$stage"
  sudo find "$stage" -type d -exec chmod 0755 {} +
  sudo find "$stage" -type f -exec chmod 0644 {} +
  sudo mv -T "$stage" "$release_dir"
  sudo restorecon -RF "$release_dir"
elif test "$action" = rollback; then
  release_dir="$site_root/releases/$revision"
  sudo test -d "$release_dir"
else
  echo 'Use release or rollback followed by exact SHA' >&2; exit 2
fi
sudo -u nginx test -r "$release_dir/index.html"
next_link="$site_root/.current-$revision"
sudo test ! -e "$next_link"
sudo test ! -L "$next_link"
sudo ln -s "$release_dir" "$next_link"
sudo mv -Tf "$next_link" "$site_root/current"
sudo restorecon "$site_root/current"
test "$(readlink -f "$site_root/current")" = "$release_dir"
printf 'Previous: %s\nCurrent: %s\n' "$previous" "$release_dir"
