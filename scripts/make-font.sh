#!/usr/bin/env bash
# Regenerate the three display-face subsets in public/fonts/.
#
# Baloo is a superfamily: one design drawn separately for each Indian script.
# We take the 700 weight of the three we need and strip each to its own script,
# so the @font-face unicode-ranges in src/index.css can hand a phone exactly
# one file. Latin rides along with the Devanagari face (it is the one every
# language needs for numbers and ₹).
#
# Needs: python3 with fonttools and brotli  ->  pip3 install fonttools brotli
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
mkdir -p public/fonts

subset () {                       # family-in-url  out-name  unicodes
  local url
  url=$(curl -fsS "https://fonts.googleapis.com/css2?family=$1:wght@700" \
        -H 'User-Agent: Mozilla/5.0 Chrome/120' | grep -o 'https://[^)]*\.ttf' | head -1)
  curl -fsS "$url" -o "$tmp/$2.ttf"
  python3 -m fontTools.subset "$tmp/$2.ttf" --unicodes="$3" --layout-features='*' \
          --flavor=woff2 --output-file="public/fonts/$2.woff2"
  printf '%-22s %s KB\n' "$2.woff2" "$(( $(wc -c < "public/fonts/$2.woff2") / 1024 ))"
}

# U+200C-200D are ZWNJ/ZWJ: Indic scripts need them to break or force conjuncts.
subset 'Baloo+2'        pehchaan-deva 'U+0020-007E,U+00A0,U+20B9,U+2018-201D,U+2026,U+0900-097F,U+A8E0-A8FF,U+200C-200D'
subset 'Baloo+Da+2'     pehchaan-beng 'U+0980-09FF,U+200C-200D'
subset 'Baloo+Thambi+2' pehchaan-taml 'U+0B80-0BFF,U+200C-200D'
