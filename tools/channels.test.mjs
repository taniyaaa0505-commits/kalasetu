// The on-ramp, checked rather than claimed.
//
// We told a room of judges we were an on-ramp to ONDC, GeM, Karigar and
// Samarth, and what we had was our own buyer board. This test is the other
// half of fixing that: it BUILDS a catalogue from a fixture shop and asserts
// every field ONDC's published schema marks required is actually in it, then
// builds the zip a coordinator would upload and makes the operating system
// open it. A claim about a file format is worth exactly as much as the file.
//
// Fields come from ONDC-Official/seller-app-protocol, webserver/main/schemas.
//
// Run: node tools/channels.test.mjs
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const out = mkdtempSync(join(tmpdir(), 'channels-'))
let bad = 0
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) bad++ }

// The source is TypeScript and imports a type-only module; bundle it the same
// way the app is built rather than keeping a second copy of it here.
const bundle = join(out, 'channels.mjs')
execFileSync('node_modules/.bin/esbuild', [
  'src/services/channels.ts', '--bundle', '--format=esm', '--platform=neutral',
  `--outfile=${bundle}`, '--log-level=error',
])
const { ondcCatalog, ONDC_REQUIRED, bulkSheet, sellable, ondcDomain, CHANNELS, readme } =
  await import(bundle)

/* ---------------- a fixture shop ---------------- */

const listing = (titleEn, craft, material) => ({
  craft, material, titleEn, titleHi: titleEn, descriptionEn: 'A handmade piece.',
  descriptionHi: 'A handmade piece.', keywords: [], questions: [], handmade: true,
  handmadeWhy: 'hand-worked',
})
const shop = [
  { id: 'p_a', createdAt: 1789000000000, status: 'published', artisanId: 'u1', lang: 'hi-IN',
    listing: listing('Handmade Clay Water Pot', 'pottery', 'terracotta'), price: { suggested: 850 } },
  { id: 'p_b', createdAt: 1789000100000, status: 'published', artisanId: 'u1', lang: 'hi-IN',
    listing: listing('Handwoven Cotton Stole', 'weaving', 'handloom cotton'), price: { suggested: 1900 } },
  // Each of these must be left out, and each for its own reason.
  { id: 'p_draft', createdAt: 1, status: 'draft', artisanId: 'u1', lang: 'hi-IN',
    listing: listing('Half-finished', 'pottery', 'clay'), price: { suggested: 100 } },
  { id: 'p_demo', createdAt: 2, status: 'published', artisanId: 'u1', lang: 'hi-IN', demo: true,
    listing: listing('Practice pot', 'pottery', 'clay'), price: { suggested: 100 } },
  { id: 'p_factory', createdAt: 3, status: 'published', artisanId: 'u1', lang: 'hi-IN',
    listing: { ...listing('Laptop', 'none', 'aluminium'), handmade: false }, price: { suggested: 40000 } },
  { id: 'p_nobody', createdAt: 4, status: 'published', lang: 'hi-IN',
    listing: listing('Orphan pot', 'pottery', 'clay'), price: { suggested: 100 } },
]

const opts = {
  sellerName: 'Mithila Crafts Producer Company',
  city: 'std:06272', gps: '26.1197,85.8918',
  address: { street: 'Jitwarpur', city: 'Madhubani', state: 'Bihar', area_code: '847211' },
  imageBase: 'https://example.org/img',
  now: 1789000200000,
  uuid: () => '00000000-0000-4000-8000-000000000000',
}

/* ---------------- what goes in, and what must not ---------------- */

check(shop.filter(sellable).length === 2, 'only published, owned, handmade, priced listings are exported')
for (const id of ['p_draft', 'p_demo', 'p_factory', 'p_nobody']) {
  check(!shop.filter(sellable).some(p => p.id === id), `  …${id} is left out`)
}

/* ---------------- the ONDC catalogue ---------------- */

const cat = ondcCatalog(shop, opts)
for (const f of ONDC_REQUIRED.context) {
  check(cat.context[f] !== undefined && cat.context[f] !== '', `context.${f} is present`)
}
check(cat.context.action === 'on_search', 'context.action is on_search')
check(/^\d{4}-\d{2}-\d{2}T.*Z$/.test(cat.context.timestamp), 'context.timestamp is RFC3339')

const catalog = cat.message.catalog
check(Boolean(catalog['bpp/descriptor']?.name), 'bpp/descriptor names the seller of record')
const provider = catalog['bpp/providers'][0]
for (const f of ONDC_REQUIRED.provider) {
  check(provider[f] !== undefined, `provider.${f} is present`)
}
check(provider.locations[0].gps === opts.gps && provider.locations[0].address.area_code === '847211',
  'the provider has a real location — the cluster’s, never her home')

check(provider.items.length === 2, 'one item per sellable listing')
for (const it of provider.items) {
  for (const f of ONDC_REQUIRED.item) {
    check(it[f] !== undefined, `item ${it.id}: ${f} is present`)
  }
  check(it.price.currency === 'INR' && Number(it.price.value) > 0, `item ${it.id}: priced in rupees`)
  check(/^P(T\d+H|\d+D)$/.test(it['@ondc/org/return_window']), `item ${it.id}: return window is an ISO-8601 duration`)
  check(/^P(T\d+H|\d+D)$/.test(it['@ondc/org/time_to_ship']), `item ${it.id}: time to ship is an ISO-8601 duration`)
  check(['unit', 'dozen', 'kilogram', 'tonne', 'litre', 'millilitre']
    .includes(it.quantity.unitized.measure.unit), `item ${it.id}: quantity unit is from the schema's list`)
  const maker = it.tags.find(t => t.code === 'attribute')?.list.find(x => x.code === 'maker_id')
  check(maker?.value === 'u1', `item ${it.id}: carries the maker's id — the one field this project exists for`)
}

// A stole is fashion and a pot is not; ONDC splits retail by domain and a
// catalogue filed under the wrong one is not discoverable.
check(ondcDomain(shop[1]) === 'ONDC:RET12', 'a handloom stole is filed under fashion')
check(ondcDomain(shop[0]) === 'ONDC:RET16', 'a clay pot is filed under home and decor')

/* ---------------- the sheet ---------------- */

const csv = bulkSheet(shop, opts.sellerName)
const lines = csv.trim().split('\n')
check(lines.length === 3, 'the sheet has a header and one row per listing')
check(lines[0].startsWith('sku,product_name,'), 'the sheet leads with sku and name')
check(lines.every(l => l.split(',').length >= 18 || l.includes('"')), 'every row is fully populated')

// A description with a comma in it must not become two columns.
const comma = bulkSheet([{ ...shop[0], listing: { ...shop[0].listing, descriptionEn: 'Round, wide, cool' } }], 'S')
check(comma.includes('"Round, wide, cool"'), 'commas inside a description are quoted, not spilled')

/* ---------------- honesty ---------------- */

for (const ch of CHANNELS) {
  check(ch.gaps.length > 0, `${ch.name}: the export says what it still needs to go live`)
}
const note = readme(CHANNELS[0], 2, opts.sellerName)
check(/We do not claim to be connected to ONDC/.test(note),
  'the bundle’s README refuses to overstate the integration')

/* ---------------- the zip actually opens ---------------- */

const zipSrc = join(out, 'zip.mjs')
execFileSync('node_modules/.bin/esbuild', [
  'src/services/zip.ts', '--bundle', '--format=esm', '--platform=neutral',
  `--outfile=${zipSrc}`, '--log-level=error',
])
const { zip } = await import(zipSrc)
const blob = zip([
  { name: 'README.txt', body: note },
  { name: 'catalogue.json', body: JSON.stringify(cat, null, 2) },
  { name: 'listings.csv', body: csv },
  { name: 'images/p_a.jpg', body: new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 1, 2, 3]) },
])
const file = join(out, 'bundle.zip')
writeFileSync(file, Buffer.from(await blob.arrayBuffer()))
try {
  execFileSync('unzip', ['-tqq', file])
  check(true, 'the bundle is a zip the operating system can open (unzip -t)')
} catch {
  check(false, 'the bundle is a zip the operating system can open (unzip -t)')
}
const listed = execFileSync('unzip', ['-Z1', file]).toString().trim().split('\n')
check(listed.join(',') === 'README.txt,catalogue.json,listings.csv,images/p_a.jpg',
  'every entry is listed, in order, including the images folder')
execFileSync('unzip', ['-oqq', file, '-d', join(out, 'x')])
check(readFileSync(join(out, 'x/listings.csv'), 'utf8') === csv, 'the sheet survives the round trip byte for byte')
check(JSON.parse(readFileSync(join(out, 'x/catalogue.json'), 'utf8')).context.action === 'on_search',
  'and the catalogue is still valid JSON after it')

console.log(bad ? `\n${bad} failed` : '\nall good')
process.exit(bad ? 1 : 0)
