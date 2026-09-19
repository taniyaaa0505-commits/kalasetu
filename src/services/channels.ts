/**
 * Turning her shop into the file each channel actually ingests.
 *
 * THE POINT, and the honest version of a claim this project got caught making:
 * we said we were an on-ramp to ONDC, GeM, Amazon Karigar and Flipkart
 * Samarth, and what we had built was our own buyer board. A board with no
 * buyers is the thing we said nobody should build.
 *
 * So this is the on-ramp, as far as an on-ramp can be built by a team with no
 * registered business entity: her catalogue, rendered into the exact payload
 * each channel takes in, ready to hand to whoever does have one — an SHG
 * federation, a cluster society, a state handicrafts corporation. Those bodies
 * ARE registered sellers on these networks already; what they do not have is
 * three hundred listings written in English with clean photographs.
 *
 * What is real here and what is not, said plainly, because being caught
 * overstating this once is enough:
 *
 *  - The ONDC catalogue is built to the published `on_search` schema from
 *    ONDC-Official/seller-app-protocol. Every field the schema marks required
 *    is present, and tools/ondc.test.mjs fails the build if one goes missing.
 *    It is NOT signed and NOT transmitted: joining the network needs a
 *    subscriber id, a registered entity and signing keys.
 *  - The three marketplace sheets are a generic bulk-listing sheet, not those
 *    platforms' own templates. Their templates live behind a seller login we
 *    do not have, and inventing column names we have not seen would be exactly
 *    the sort of claim that got us caught. The columns below are the ones
 *    every such sheet asks for; mapping them onto a specific template is an
 *    afternoon once somebody with a seller account shares it.
 */
import type { Product } from '../types'

export type ChannelId = 'ondc' | 'gem' | 'karigar' | 'samarth'

export interface Channel {
  id: ChannelId
  name: string
  /** What the file IS, in one line, for the person deciding whether to trust it. */
  format: string
  /** What still stands between this file and a live listing. Never hidden. */
  gaps: string[]
}

export const CHANNELS: Channel[] = [
  {
    id: 'ondc',
    name: 'ONDC',
    format: 'beckn on_search catalogue (JSON), built to the published ONDC retail schema',
    gaps: [
      'A registered business entity, GST and PAN — an SHG federation or cluster society qualifies; a student team does not',
      'A network subscriber id and signing keys, issued on registration',
      'The seller’s GPS and postal address — we ship the cluster’s, not hers, and never her home',
      'Image hosting: the photographs travel in this bundle, and need a public URL before a buyer app can render them',
    ],
  },
  {
    id: 'gem',
    name: 'GeM',
    format: 'Bulk catalogue sheet (CSV) + photographs',
    gaps: [
      'A GeM seller account, which requires a registered entity and Udyam registration',
      'GeM category codes: handicrafts sit under several, and the right one is chosen per craft at upload',
    ],
  },
  {
    id: 'karigar',
    name: 'Amazon Karigar',
    format: 'Bulk listing sheet (CSV) + photographs',
    gaps: [
      'A seller account and Karigar programme enrolment',
      'Amazon’s own flat-file template, which is behind a seller login — these columns map onto it, they are not a copy of it',
    ],
  },
  {
    id: 'samarth',
    name: 'Flipkart Samarth',
    format: 'Bulk listing sheet (CSV) + photographs',
    gaps: [
      'A seller account and Samarth programme enrolment',
      'Flipkart’s category-specific template, same as above',
    ],
  },
]

/**
 * The fields ONDC's schema marks required on an item.
 *
 * Kept as data, not as a comment, because tools/ondc.test.mjs asserts every
 * one of them against a catalogue this file builds. A required field that
 * quietly stops being emitted is how an integration claim rots.
 */
export const ONDC_REQUIRED = {
  context: ['domain', 'action', 'core_version', 'bap_id', 'bap_uri',
            'transaction_id', 'message_id', 'city', 'country', 'timestamp'],
  provider: ['id', 'descriptor', 'fulfillments', 'locations', 'items'],
  item: ['id', 'descriptor', 'price', 'quantity', 'category_id', 'fulfillment_id',
         '@ondc/org/returnable', '@ondc/org/seller_pickup_return',
         '@ondc/org/return_window', '@ondc/org/cancellable'],
} as const

/**
 * Which retail category a craft belongs to.
 *
 * ONDC splits retail into domains, and handicrafts land in two of them
 * depending on the object: a stole is fashion, a pot is home and decor. We
 * pick from the craft the model already named rather than asking her, because
 * she is not going to answer a question about an ONDC domain code.
 */
export function ondcDomain(p: Product): string {
  const craft = `${p.listing?.craft ?? ''} ${p.listing?.material ?? ''}`.toLowerCase()
  const fashion = ['saree', 'sari', 'stole', 'dupatta', 'shawl', 'textile', 'fabric',
                   'cloth', 'silk', 'cotton', 'weave', 'ikat', 'embroider', 'bag', 'jewel']
  return fashion.some(w => craft.includes(w)) ? 'ONDC:RET12' : 'ONDC:RET16'
}

export interface CatalogueOptions {
  /** Who is the seller of record — the body that holds the ONDC registration. */
  sellerName: string
  /** Where they are. ONDC needs a real location on the provider, not the artisan's home. */
  city: string          // e.g. 'std:06272'
  gps: string           // 'lat,long'
  address: { street: string; city: string; state: string; area_code: string }
  /** Where the photographs will live once hosted. Referenced, not embedded. */
  imageBase: string
  /** Fixed in tests so two runs of the same shop produce the same file. */
  now?: number
  uuid?: () => string
}

const iso = (ms: number) => new Date(ms).toISOString()

/**
 * Her shop as an ONDC `on_search` catalogue.
 *
 * Shape and field names come from the schema in
 * ONDC-Official/seller-app-protocol (webserver/main/schemas/schema.json).
 */
export function ondcCatalog(products: Product[], o: CatalogueOptions) {
  const now = o.now ?? Date.now()
  const id = o.uuid ?? (() => crypto.randomUUID())
  const live = products.filter(sellable)

  return {
    context: {
      domain: live.length ? ondcDomain(live[0]) : 'ONDC:RET16',
      country: 'IND',
      city: o.city,
      action: 'on_search',
      core_version: '1.2.0',
      bap_id: 'pehchaan.example',        // the buyer app that asked; a placeholder until we are on a network
      bap_uri: 'https://pehchaan.example/ondc',
      bpp_id: 'pehchaan.example',
      bpp_uri: 'https://pehchaan.example/ondc',
      transaction_id: id(),
      message_id: id(),
      timestamp: iso(now),
      ttl: 'PT30S',
    },
    message: {
      catalog: {
        'bpp/fulfillments': [{ id: '1', type: 'Delivery' }],
        'bpp/descriptor': {
          name: o.sellerName,
          symbol: `${o.imageBase}/seller.png`,
          short_desc: 'Handmade crafts, listed by the artisans who made them',
          long_desc: 'Catalogue produced by Pehchaan: each listing is written from the ' +
                     'maker’s own photograph and her own spoken description, in her language.',
          images: [`${o.imageBase}/seller.png`],
        },
        'bpp/providers': [{
          id: 'P1',
          time: { label: 'enable', timestamp: iso(now) },
          fulfillments: [{ id: '1', type: 'Delivery', contact: { phone: '0000000000', email: 'seller@example.org' } }],
          descriptor: {
            name: o.sellerName,
            symbol: `${o.imageBase}/seller.png`,
            short_desc: o.sellerName,
            long_desc: o.sellerName,
            images: [`${o.imageBase}/seller.png`],
          },
          ttl: 'P1D',
          locations: [{
            id: 'L1',
            gps: o.gps,
            address: o.address,
          }],
          items: live.map(p => item(p, o)),
        }],
      },
    },
  }
}

/** Published, owned, not a practice piece, not held back, and priced. */
export function sellable(p: Product): boolean {
  return p.status === 'published' && Boolean(p.artisanId) && !p.demo
    && p.listing?.handmade !== false && Boolean(p.price?.suggested) && Boolean(p.listing)
}

function item(p: Product, o: CatalogueOptions) {
  const price = String(p.price!.suggested)
  return {
    id: p.id,
    descriptor: {
      name: p.listing!.titleEn,
      code: `1:${p.id}`,          // 1 = seller's own code, per the schema's code format
      symbol: `${o.imageBase}/${p.id}.jpg`,
      short_desc: p.listing!.craft || p.listing!.titleEn,
      long_desc: p.listing!.descriptionEn,
      images: [`${o.imageBase}/${p.id}.jpg`],
    },
    price: {
      currency: 'INR',
      value: price,
      maximum_value: price,
    },
    quantity: {
      unitized: { measure: { unit: 'unit', value: '1' } },
      available: { count: '1' },
      maximum: { count: '1' },
    },
    category_id: ondcDomain(p) === 'ONDC:RET12' ? 'Fashion' : 'Home & Decor',
    fulfillment_id: '1',
    location_id: 'L1',
    /*
     * Handmade, made to order, one of one.
     *
     * A returnable one-off that took her nine days is not a kindness to
     * anyone, and the schema wants the answer stated rather than assumed.
     * Ten days to ship because this is a person at a loom, not a warehouse.
     */
    '@ondc/org/returnable': false,
    '@ondc/org/cancellable': true,
    '@ondc/org/return_window': 'P0D',
    '@ondc/org/seller_pickup_return': false,
    '@ondc/org/time_to_ship': 'P10D',
    '@ondc/org/available_on_cod': false,
    '@ondc/org/contact_details_consumer_care': `${o.sellerName}, seller@example.org, 0000000000`,
    tags: [
      { code: 'origin', list: [{ code: 'country', value: 'IND' }] },
      // The thing this whole app exists to carry. It is not a required field
      // anywhere; it is the only field that says a person made this.
      { code: 'attribute', list: [
        { code: 'craft', value: p.listing!.craft || 'Handicraft' },
        { code: 'material', value: p.listing!.material || '' },
        { code: 'handmade', value: 'true' },
        { code: 'maker_id', value: p.artisanId ?? '' },
      ] },
    ],
  }
}

/* ---------------- the marketplace sheets ---------------- */

/** One row per product. See the header note on what these columns are and are not. */
const SHEET_COLUMNS = [
  'sku', 'product_name', 'brand', 'category', 'craft', 'material',
  'description', 'bullet_1', 'bullet_2',
  'mrp_inr', 'selling_price_inr', 'quantity', 'country_of_origin',
  'handling_days', 'main_image', 'maker_id', 'maker_language', 'listed_on',
] as const

function csvCell(v: string | number | undefined): string {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function bulkSheet(products: Product[], sellerName: string): string {
  const rows = [SHEET_COLUMNS.join(',')]
  for (const p of products.filter(sellable)) {
    const l = p.listing!
    rows.push([
      p.id,
      l.titleEn,
      sellerName,
      ondcDomain(p) === 'ONDC:RET12' ? 'Fashion' : 'Home & Decor',
      l.craft,
      l.material,
      l.descriptionEn,
      `Handmade by an artisan, in ${l.material || 'traditional materials'}`,
      'Made to order — no two pieces are identical',
      p.price!.suggested,
      p.price!.suggested,
      1,
      'India',
      10,
      `images/${p.id}.jpg`,
      p.artisanId ?? '',
      p.lang,
      new Date(p.createdAt).toISOString().slice(0, 10),
    ].map(csvCell).join(','))
  }
  return rows.join('\n') + '\n'
}

/**
 * A README that travels with the bundle.
 *
 * The person who opens this zip is a cluster coordinator or a corporation's
 * e-commerce cell, not us, and the first thing they need to know is what they
 * are holding and what it still needs.
 */
export function readme(channel: Channel, count: number, sellerName: string): string {
  return [
    `Pehchaan — catalogue export for ${channel.name}`,
    ``,
    `${count} listing(s), seller of record: ${sellerName}`,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `WHAT IS IN HERE`,
    `  ${channel.format}`,
    `  images/  one photograph per listing, background removed, square, white`,
    ``,
    `HOW IT WAS MADE`,
    `  Each listing was written from the artisan's own photograph and a spoken`,
    `  description in her own language. The title and description are generated,`,
    `  then read back to her, and nothing is published without her approval.`,
    `  Prices are never below her own cost of materials and labour.`,
    ``,
    `WHAT THIS FILE STILL NEEDS BEFORE IT IS A LIVE LISTING`,
    ...channel.gaps.map(g => `  - ${g}`),
    ``,
    `We do not claim to be connected to ${channel.name}. This is the catalogue,`,
    `in the format ${channel.name} ingests, ready for a registered seller to upload.`,
    ``,
  ].join('\n')
}
