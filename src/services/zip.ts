/**
 * A ZIP file, written in the browser, with no library.
 *
 * Every channel we export to takes a spreadsheet plus a folder of photographs
 * — that is what a bulk-listing upload IS — and a folder is a zip. JSZip is
 * 100 KB to do one thing we need one eighth of: stored (uncompressed) entries,
 * which is a header, the bytes, and a table at the end.
 *
 * Uncompressed on purpose. The payload is JPEG, which does not compress, and
 * the alternative is shipping a deflate implementation to an artisan's phone
 * to make a file she will hand to a coordinator on a laptop.
 */

/** Standard CRC-32, table built once. Every entry needs one, twice. */
const TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()

function crc32(bytes: Bytes | Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

type Bytes = Uint8Array<ArrayBuffer>

export interface ZipEntry {
  /** Path inside the zip, e.g. `images/p_abc.jpg`. Forward slashes only. */
  name: string
  body: string | Bytes
}

/** `data:image/jpeg;base64,…` → the bytes. Our photographs are all data URLs. */
export function dataUrlToBytes(dataUrl: string): Bytes {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const binary = atob(base64)
  const out = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

export function zip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder()
  const chunks: BlobPart[] = []
  const central: Bytes[] = []
  let offset = 0

  for (const entry of entries) {
    const name: Bytes = encoder.encode(entry.name) as Bytes
    const body: Bytes = typeof entry.body === 'string' ? encoder.encode(entry.body) as Bytes : entry.body
    const sum = crc32(body)

    // Local file header, then the bytes. Method 0 = stored. The date is left
    // at zero: a zip with no timestamps still opens everywhere, and a real one
    // would mean converting to MS-DOS time for no reader's benefit.
    const header = new DataView(new ArrayBuffer(30))
    header.setUint32(0, 0x04034b50, true)   // signature
    header.setUint16(4, 20, true)           // version needed
    header.setUint16(6, 0x0800, true)       // UTF-8 names
    header.setUint16(8, 0, true)            // stored
    header.setUint32(14, sum, true)
    header.setUint32(18, body.length, true) // compressed size
    header.setUint32(22, body.length, true) // uncompressed size
    header.setUint16(26, name.length, true)
    chunks.push(header.buffer, name, body)

    const dir = new DataView(new ArrayBuffer(46))
    dir.setUint32(0, 0x02014b50, true)
    dir.setUint16(4, 20, true)              // version made by
    dir.setUint16(6, 20, true)              // version needed
    dir.setUint16(8, 0x0800, true)
    dir.setUint16(10, 0, true)
    dir.setUint32(16, sum, true)
    dir.setUint32(20, body.length, true)
    dir.setUint32(24, body.length, true)
    dir.setUint16(28, name.length, true)
    dir.setUint32(42, offset, true)         // where its local header starts
    const record: Bytes = new Uint8Array(new ArrayBuffer(46 + name.length))
    record.set(new Uint8Array(dir.buffer), 0)
    record.set(name, 46)
    central.push(record)

    offset += 30 + name.length + body.length
  }

  const dirBytes = central.reduce((n, r) => n + r.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, central.length, true)    // entries on this disk
  end.setUint16(10, central.length, true)   // entries total
  end.setUint32(12, dirBytes, true)
  end.setUint32(16, offset, true)           // where the directory starts

  return new Blob([...chunks, ...central, end.buffer], { type: 'application/zip' })
}
